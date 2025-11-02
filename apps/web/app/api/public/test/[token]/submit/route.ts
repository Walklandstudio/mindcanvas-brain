// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AB = "A" | "B" | "C" | "D";
type PMEntry = { points?: number; profile?: string };
type QuestionRow = { id: string; idx?: number | string | null; profile_map?: PMEntry[] | null };

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

// Accept PROFILE_1..8 or P1..P8 → A/B/C/D; fallback if value already starts with A/B/C/D
function profileCodeToFreq(code: string): AB | null {
  const s = String(code || "").trim().toUpperCase();
  let n: number | null = null;
  const m1 = s.match(/^P(?:ROFILE)?[_\s-]?(\d+)$/);
  if (m1) n = Number(m1[1]);
  if (n && n >= 1 && n <= 8) return (n <= 2 ? "A" : n <= 4 ? "B" : n <= 6 ? "C" : "D") as AB;
  const ch = s[0];
  return ch === "A" || ch === "B" || ch === "C" || ch === "D" ? (ch as AB) : null;
}

function toZeroBasedSelected(row: any): number | null {
  if (row && typeof row.value === "number" && Number.isFinite(row.value)) {
    const sel = row.value - 1;
    return sel >= 0 ? sel : null;
  }
  if (typeof row.index === "number") return row.index;
  if (typeof row.selected === "number") return row.selected;
  if (typeof row.selected_index === "number") return row.selected_index;
  if (row?.value && typeof row.value.index === "number") return row.value.index;
  return null;
}

const asNumber = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const takerId: string | undefined = body.taker_id || body.takerId || body.tid;
    if (!takerId) return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });

    const answers: any[] = Array.isArray(body.answers) ? body.answers : [];
    const sb = supa();

    // Resolve taker → test
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, test_id, link_token, first_name, last_name, email, company, role_title")
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();

    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "Taker not found for this token" }, { status: 404 });
    }

    // Load questions with profile_map (drives scoring)
    const { data: questions, error: qErr } = await sb
      .from("test_questions")
      .select("id, idx, profile_map")
      .eq("test_id", taker.test_id)
      .order("idx", { ascending: true })
      .order("created_at", { ascending: true });

    if (qErr) {
      return NextResponse.json({ ok: false, error: `Questions load failed: ${qErr.message}` }, { status: 500 });
    }

    const byId: Record<string, QuestionRow> = {};
    for (const q of questions || []) byId[q.id] = q;

    // Labels: name→code and code→frequency for this test
    const { data: labels, error: labErr } = await sb
      .from("test_profile_labels")
      .select("profile_code, profile_name, frequency_code")
      .eq("test_id", taker.test_id);

    if (labErr) {
      return NextResponse.json({ ok: false, error: `Labels load failed: ${labErr.message}` }, { status: 500 });
    }

    const nameToCode = new Map<string, string>();
    const codeToFreq = new Map<string, AB>();
    for (const r of labels || []) {
      const code = String(r.profile_code || "").trim();
      const name = String(r.profile_name || "").trim();
      const f = String(r.frequency_code || "").trim().toUpperCase();
      if (name && code) nameToCode.set(name, code);
      if (code) {
        if (f === "A" || f === "B" || f === "C" || f === "D") {
          codeToFreq.set(code, f as AB);
        } else {
          const implied = profileCodeToFreq(code);
          if (implied) codeToFreq.set(code, implied);
        }
      }
    }

    // Compute totals
    const freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
    const profileTotals: Record<string, number> = {};

    for (let idx = 0; idx < answers.length; idx++) {
      const row = answers[idx];
      const qid = row?.question_id || row?.qid || row?.id;
      const q: QuestionRow | undefined = qid ? byId[qid] : undefined;
      if (!q || !Array.isArray(q.profile_map) || q.profile_map.length === 0) continue;

      const sel = toZeroBasedSelected(row);
      if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

      const entry = q.profile_map[sel] || {};
      const points = asNumber(entry.points, 0);
      let pcode = String(entry.profile || "").trim();

      // Resolve profile *name* → code if needed
      if (pcode && !/^P(?:ROFILE)?[_\s-]?\d+$/i.test(pcode)) {
        const fromName = nameToCode.get(pcode);
        if (fromName) pcode = fromName;
      }
      if (!pcode || points <= 0) continue;

      profileTotals[pcode] = (profileTotals[pcode] || 0) + points;

      const f = codeToFreq.get(pcode) || profileCodeToFreq(pcode);
      if (f) freqTotals[f] += points;
    }

    // Persist submission snapshot — write nested totals
    const totals = {
      frequencies: { A: freqTotals.A, B: freqTotals.B, C: freqTotals.C, D: freqTotals.D },
      profiles: profileTotals,
    };

    const { error: subErr } = await sb.from("test_submissions").insert({
      taker_id: taker.id,
      test_id: taker.test_id,
      link_token: token,
      totals,
      answers_json: answers,
      raw_answers: answers,
      first_name: taker.first_name ?? null,
      last_name: taker.last_name ?? null,
      email: taker.email ?? null,
      company: taker.company ?? null,
      role_title: taker.role_title ?? null,
    });
    if (subErr) {
      return NextResponse.json({ ok: false, error: `Submission insert failed: ${subErr.message}` }, { status: 500 });
    }

    // Upsert denormalized results (nested totals)
    const { error: upErr } = await sb
      .from("test_results")
      .upsert({ taker_id: taker.id, totals }, { onConflict: "taker_id" });
    if (upErr) {
      return NextResponse.json({ ok: false, error: `Results upsert failed: ${upErr.message}` }, { status: 500 });
    }

    // Mark taker completed (best-effort)
    await sb.from("test_takers").update({ status: "completed" }).eq("id", taker.id).eq("link_token", token);

    return NextResponse.json({ ok: true, totals });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
