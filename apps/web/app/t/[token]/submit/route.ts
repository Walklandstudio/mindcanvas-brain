import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AB = "A" | "B" | "C" | "D";
type PMEntry = { points?: number; profile?: string };
type QuestionRow = { id: string; idx?: number | string | null; profile_map?: PMEntry[] | null };

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" }, auth: { persistSession: false } });
}

function profileCodeToFreq(code: string): AB | null {
  const s = String(code || "").trim().toUpperCase();
  const m = s.match(/^P(?:ROFILE)?[_\s-]?(\d+)$/); // PROFILE_1 or P1
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 8) return (n <= 2 ? "A" : n <= 4 ? "B" : n <= 6 ? "C" : "D") as AB;
  }
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

function asNumber(x: any, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

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

    // Load questions
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

    // Compute frequency totals from answers
    const freq: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };

    for (let idx = 0; idx < answers.length; idx++) {
      const row = answers[idx];
      const qid = row?.question_id || row?.qid || row?.id;
      const q: QuestionRow | undefined = qid ? byId[qid] : undefined;
      if (!q || !Array.isArray(q.profile_map) || q.profile_map.length === 0) continue;

      const sel = toZeroBasedSelected(row);
      if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

      const entry = q.profile_map[sel] || {};
      const points = asNumber(entry.points, 0);
      const pcode = String(entry.profile || "").trim();
      const f = profileCodeToFreq(pcode);
      if (f && points > 0) freq[f] += points;
    }

    const submissionTotals = { A: freq.A, B: freq.B, C: freq.C, D: freq.D };

    const { error: subErr } = await sb.from("test_submissions").insert({
      taker_id: taker.id,
      test_id: taker.test_id,
      link_token: token,
      totals: submissionTotals,
      answers_json: answers,
      first_name: taker.first_name ?? null,
      last_name: taker.last_name ?? null,
      email: taker.email ?? null,
      company: taker.company ?? null,
      role_title: taker.role_title ?? null,
    });
    if (subErr) {
      return NextResponse.json({ ok: false, error: `Submission insert failed: ${subErr.message}` }, { status: 500 });
    }

    await sb.from("test_results").upsert({ taker_id: taker.id, totals: submissionTotals }, { onConflict: "taker_id" });
    await sb.from("test_takers").update({ status: "completed" }).eq("id", taker.id).eq("link_token", token);

    return NextResponse.json({ ok: true, totals: submissionTotals });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
