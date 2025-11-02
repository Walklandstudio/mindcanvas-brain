// apps/web/app/api/public/test/[token]/debug-last/route.ts
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

function orderQuestions(questions: QuestionRow[]): QuestionRow[] {
  const withNum = questions.map((q) => ({ ...q, _n: q.idx == null ? null : Number(q.idx) }));
  const haveNum = withNum.every((q) => Number.isFinite(q._n as any));
  return haveNum ? withNum.sort((a, b) => Number(a._n) - Number(b._n)) : questions;
}
function readSelectedIndex(row: any): number | null {
  if (typeof row?.selected === "number") return row.selected;
  if (typeof row?.selected_index === "number") return row.selected_index;
  if (typeof row?.index === "number") return row.index;
  if (typeof row?.value?.index === "number") return row.value.index;
  return null;
}
function profileToFreq(profileValue: string): AB | null {
  const s = String(profileValue || "").trim().toUpperCase();
  let n: number | null = null;
  const m1 = s.match(/^P(\d+)$/);
  const m2 = s.match(/^PROFILE[_\s-]?(\d+)$/);
  if (m1) n = Number(m1[1]);
  else if (m2) n = Number(m2[1]);
  if (n && n >= 1 && n <= 8) return n <= 2 ? "A" : n <= 4 ? "B" : n <= 6 ? "C" : "D";
  const first = s[0];
  if (first === "A" || first === "B" || first === "C" || first === "D") return first as AB;
  return null;
}
function computeTotalsFrom(answers: any, questions: QuestionRow[]) {
  const freq: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
  const rows: any[] = Array.isArray(answers) ? answers : (answers?.rows || answers?.items || []);
  const qsOrdered = orderQuestions(questions);
  const byId: Record<string, QuestionRow> = {};
  for (const q of questions) byId[q.id] = q;

  const sample: Array<{ qid: string; sel: number | null; points?: number; profile?: string; freq?: AB | null }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const qid = row?.question_id || row?.qid || row?.id;
    const q = (qid && byId[qid]) ? byId[qid] : qsOrdered[i];
    const sel = readSelectedIndex(row);
    if (!q || !Array.isArray(q.profile_map) || q.profile_map.length === 0) {
      sample.push({ qid: qid || (q?.id || `row#${i}`), sel: sel ?? null });
      continue;
    }
    if (sel == null || sel < 0 || sel >= q.profile_map.length) {
      sample.push({ qid: q.id, sel: sel ?? null });
      continue;
    }
    const entry = q.profile_map[sel] || {};
    const points = Number(entry.points ?? 0) || 0;
    const prof = entry.profile || "";
    const f = profileToFreq(prof);
    if (f && points > 0) freq[f] += points;
    sample.push({ qid: q.id, sel, points, profile: prof, freq: f });
  }
  return { preview_totals: freq, sample };
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    const { searchParams } = new URL(req.url);
    const tid = searchParams.get("tid");

    const sb = supa();

    // Find latest taker for this token (or use tid if provided)
    let taker: any = null;
    if (tid) {
      const { data } = await sb
        .from("test_takers")
        .select("id, test_id, link_token, status")
        .eq("id", tid)
        .eq("link_token", token)
        .maybeSingle();
      taker = data;
    } else {
      const { data } = await sb
        .from("test_takers")
        .select("id, test_id, link_token, status, created_at")
        .eq("link_token", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      taker = data;
    }
    if (!taker) {
      return NextResponse.json({ ok: false, error: "No taker found for token" }, { status: 404 });
    }

    // Load most recent submission for that taker
    const { data: sub } = await sb
      .from("test_submissions")
      .select("totals, answers_json, created_at")
      .eq("taker_id", taker.id)
      .eq("link_token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load questions for that test
    const { data: questions } = await sb
      .from("test_questions")
      .select("id, idx, profile_map")
      .eq("test_id", taker.test_id)
      .order("created_at", { ascending: true });

    const answersCount = Array.isArray(sub?.answers_json)
      ? sub?.answers_json.length
      : Array.isArray((sub?.answers_json as any)?.rows)
      ? (sub?.answers_json as any).rows.length
      : null;

    const computed = (sub?.answers_json && questions)
      ? computeTotalsFrom(sub.answers_json, questions as QuestionRow[])
      : null;

    return NextResponse.json({
      ok: true,
      token,
      taker_id: taker.id,
      answers_present: !!sub?.answers_json,
      answers_count: answersCount,
      saved_totals: sub?.totals ?? null,
      computed_from_db: computed ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
