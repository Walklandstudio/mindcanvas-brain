// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AB = "A" | "B" | "C" | "D";
type PMEntry = { points?: number; profile?: string };
type QuestionRow = { id: string; idx?: string | number | null; profile_map?: PMEntry[] | null };

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function sumABCD(t?: Partial<Record<AB, number>> | null) {
  if (!t) return 0;
  return (Number(t.A || 0) + Number(t.B || 0) + Number(t.C || 0) + Number(t.D || 0));
}

function orderQuestions(questions: QuestionRow[]): QuestionRow[] {
  const withNum = questions.map((q) => ({ ...q, _n: q.idx == null ? null : Number(q.idx) }));
  const haveNum = withNum.every((q) => Number.isFinite(q._n as any));
  return haveNum ? withNum.sort((a, b) => Number(a._n) - Number(b._n)) : questions;
}

/** P1..P8 or PROFILE_1..PROFILE_8 => 1–2 A, 3–4 B, 5–6 C, 7–8 D */
function profileToFreq(profileValue: string): AB | null {
  const s = String(profileValue || "").trim().toUpperCase();
  let n: number | null = null;
  const m1 = s.match(/^P(\d+)$/);             // P1
  const m2 = s.match(/^PROFILE[_\s-]?(\d+)$/); // PROFILE_1
  if (m1) n = Number(m1[1]);
  else if (m2) n = Number(m2[1]);
  if (n && n >= 1 && n <= 8) {
    if (n <= 2) return "A";
    if (n <= 4) return "B";
    if (n <= 6) return "C";
    return "D";
  }
  const first = s[0];
  if (first === "A" || first === "B" || first === "C" || first === "D") return first as AB;
  return null;
}

function readSelectedIndex(row: any): number | null {
  if (typeof row?.selected === "number") return row.selected;
  if (typeof row?.selected_index === "number") return row.selected_index;
  if (typeof row?.index === "number") return row.index;
  if (typeof row?.value?.index === "number") return row.value.index;
  return null;
}

/** Score from DB questions + submitted answers */
function computeTotalsFrom(answers: any, questions: QuestionRow[]): Record<AB, number> {
  const freq: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
  const rows: any[] = Array.isArray(answers) ? answers : (answers?.rows || answers?.items || []);
  const qsOrdered = orderQuestions(questions);
  const byId: Record<string, QuestionRow> = {};
  for (const q of questions) byId[q.id] = q;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const qid = row?.question_id || row?.qid || row?.id;
    const q = (qid && byId[qid]) ? byId[qid] : qsOrdered[i];
    if (!q || !Array.isArray(q.profile_map) || q.profile_map.length === 0) continue;

    const sel = readSelectedIndex(row);
    if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

    const entry = q.profile_map[sel] || {};
    const points = Number(entry.points ?? 0) || 0;
    const prof = entry.profile || "";
    const f = profileToFreq(prof);
    if (f && points > 0) freq[f] += points;
  }
  return freq;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const takerId: string | undefined = body.taker_id || body.takerId || body.tid;
    if (!takerId) return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });

    // Answers are required if client didn't pre-compute totals
    const answers_json = body.answers ?? null;
    let totals: Partial<Record<AB, number>> = body.frequency_totals ?? body.totals ?? {};

    const sb = supa();

    // Resolve taker (and test_id) under this token
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, test_id, link_token, first_name, last_name, email, company, role_title")
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();
    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "Taker not found for this token" }, { status: 404 });
    }

    // If totals are empty/zero, we MUST compute from DB + answers_json
    if (sumABCD(totals) <= 0) {
      if (!answers_json) {
        return NextResponse.json(
          { ok: false, error: "answers_json missing; cannot compute scoring" },
          { status: 400 }
        );
      }

      const { data: questions, error: qErr } = await sb
        .from("test_questions")
        .select("id, idx, profile_map")
        .eq("test_id", taker.test_id)
        .order("created_at", { ascending: true });
      if (qErr) {
        return NextResponse.json({ ok: false, error: `Questions load failed: ${qErr.message}` }, { status: 500 });
      }

      totals = computeTotalsFrom(answers_json, (questions || []) as QuestionRow[]);
      if (sumABCD(totals) <= 0) {
        // Hard stop: we do NOT save empty totals; this protects you from silent zeros.
        return NextResponse.json(
          { ok: false, error: "Computed totals are zero. Check that each answer row has a valid selected index and profile_map has points." },
          { status: 400 }
        );
      }
    }

    const submissionTotals = {
      A: Number(totals.A || 0),
      B: Number(totals.B || 0),
      C: Number(totals.C || 0),
      D: Number(totals.D || 0),
    };

    // Insert submission snapshot
    const { error: subErr } = await sb.from("test_submissions").insert({
      taker_id: taker.id,
      test_id: taker.test_id,
      link_token: token,
      totals: submissionTotals,
      answers_json,
      first_name: taker.first_name ?? null,
      last_name: taker.last_name ?? null,
      email: taker.email ?? null,
      company: taker.company ?? null,
      role_title: taker.role_title ?? null,
    });
    if (subErr) {
      return NextResponse.json({ ok: false, error: `Submission insert failed: ${subErr.message}` }, { status: 500 });
    }

    // Upsert denormalized results
    await sb
      .from("test_results")
      .upsert({ taker_id: taker.id, totals: submissionTotals }, { onConflict: "taker_id" });

    // Mark taker completed
    await sb
      .from("test_takers")
      .update({ status: "completed" })
      .eq("id", taker.id)
      .eq("link_token", token);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
