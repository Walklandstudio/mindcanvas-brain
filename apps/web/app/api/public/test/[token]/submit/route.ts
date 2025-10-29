// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AB = "A" | "B" | "C" | "D";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

/* ---------------------------- helpers ---------------------------- */

type PMEntry = { points?: number; profile?: string };
type QuestionRow = { id: string; idx?: string | number | null; profile_map?: PMEntry[] | null };

function sumABCD(t?: Partial<Record<AB, number>> | null) {
  if (!t) return 0;
  return (Number(t.A || 0) + Number(t.B || 0) + Number(t.C || 0) + Number(t.D || 0));
}

function orderQuestions(questions: QuestionRow[]): QuestionRow[] {
  const withNum = questions.map((q) => ({ ...q, _n: q.idx == null ? null : Number(q.idx) }));
  const haveNum = withNum.every((q) => Number.isFinite(q._n as any));
  return haveNum ? withNum.sort((a, b) => Number(a._n) - Number(b._n)) : questions;
}

/** Accept P1..P8 or PROFILE_1..PROFILE_8 (case-insensitive), map 1–2→A, 3–4→B, 5–6→C, 7–8→D */
function profileToFreq(_orgSlug: string, profileValue: string): AB | null {
  const s = String(profileValue || "").trim().toUpperCase();

  // Normalize to a number 1..8
  let n: number | null = null;
  const m1 = s.match(/^P(\d+)$/); // P1
  const m2 = s.match(/^PROFILE[_\s-]?(\d+)$/); // PROFILE_1
  if (m1) n = Number(m1[1]);
  else if (m2) n = Number(m2[1]);

  if (n && n >= 1 && n <= 8) {
    if (n <= 2) return "A";
    if (n <= 4) return "B";
    if (n <= 6) return "C";
    return "D"; // 7–8
  }

  // Fallback: allow direct flow codes if ever used
  const first = s[0];
  if (first === "A" || first === "B" || first === "C" || first === "D") return first as AB;

  return null;
}

/** Try to read selected index from common answer shapes */
function readSelectedIndex(row: any): number | null {
  if (typeof row?.selected === "number") return row.selected;
  if (typeof row?.selected_index === "number") return row.selected_index;
  if (typeof row?.index === "number") return row.index;
  if (typeof row?.value?.index === "number") return row.value.index;
  return null;
}

/** Compute A/B/C/D from answers + DB-backed profile_map */
function computeTotalsFrom(answers: any, questions: QuestionRow[], orgSlug: string): Record<AB, number> {
  const freq: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
  const rows: any[] = Array.isArray(answers) ? answers : answers?.rows || answers?.items || [];

  const qsOrdered = orderQuestions(questions);
  const byId: Record<string, QuestionRow> = {};
  for (const q of questions) byId[q.id] = q;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Match by explicit question_id if present; else fall back to order
    const qid = row?.question_id || row?.qid || row?.id;
    const q = (qid && byId[qid]) ? byId[qid] : qsOrdered[i];
    if (!q || !Array.isArray(q.profile_map) || q.profile_map.length === 0) continue;

    const sel = readSelectedIndex(row);
    if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

    const entry = q.profile_map[sel] || {};
    const points = Number(entry.points ?? 0) || 0;
    const prof = entry.profile || "";
    const f = profileToFreq(orgSlug, prof);
    if (f && points > 0) {
      freq[f] = (freq[f] || 0) + points;
    }
  }
  return freq;
}

/* ------------------------------ route ------------------------------ */

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const takerId: string | undefined = body.taker_id || body.takerId || body.tid;
    if (!takerId) return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });

    // answers_json is required if client didn't compute totals
    const answers_json = body.answers ?? null;

    // Accept either frequency_totals or totals from client; may be empty
    let totals: Partial<Record<AB, number>> = body.frequency_totals ?? body.totals ?? {};

    const sb = supa();

    // 1) Resolve taker (and test_id) under this token
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, test_id, link_token, first_name, last_name, email, company, role_title")
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();
    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "Taker not found for this token" }, { status: 404 });
    }

    // 2) Resolve org slug (from link; fallback via v_organizations)
    const { data: linkRow } = await sb
      .from("test_links")
      .select("org_id, org_slug")
      .eq("token", token)
      .maybeSingle();

    let orgSlug: string | null = (linkRow as any)?.org_slug || null;
    if (!orgSlug && linkRow?.org_id) {
      const { data: orgView } = await sb
        .from("v_organizations" as any)
        .select("slug")
        .eq("id", linkRow.org_id)
        .maybeSingle();
      orgSlug = orgView?.slug || null;
    }
    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: "Cannot resolve org for mapping" }, { status: 400 });
    }

    // 3) If totals missing/zero, compute from DB questions + answers_json using profile_map
    if (sumABCD(totals) <= 0) {
      if (!answers_json) {
        return NextResponse.json({ ok: false, error: "Missing answers; cannot compute totals" }, { status: 400 });
      }

      // Load minimal question fields for this test
      const { data: questions, error: qErr } = await sb
        .from("test_questions")
        .select("id, idx, profile_map")
        .eq("test_id", taker.test_id)
        .order("created_at", { ascending: true });
      if (qErr) {
        return NextResponse.json({ ok: false, error: `Questions load failed: ${qErr.message}` }, { status: 500 });
      }

      totals = computeTotalsFrom(answers_json, (questions || []) as QuestionRow[], orgSlug);
    }

    // 4) Snapshot submission (correct column: totals)
    const submissionTotals = {
      A: Number(totals.A || 0),
      B: Number(totals.B || 0),
      C: Number(totals.C || 0),
      D: Number(totals.D || 0),
    };

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

    // 5) Upsert results (preferred source for report)
    const { error: resErr } = await sb
      .from("test_results")
      .upsert({ taker_id: taker.id, totals: submissionTotals }, { onConflict: "taker_id" });
    if (resErr) {
      // Non-fatal; report will fall back to submissions
      console.warn("test_results upsert failed", resErr.message);
    }

    // 6) Mark taker completed
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
