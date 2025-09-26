// app/api/submissions/[id]/result/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getTestConfig, type TestConfig } from "@/lib/testConfigs";

// --- helpers ---------------------------------------------------------------

function isStr(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}
function topKey(rec: Record<string, number>): string | null {
  let best: string | null = null;
  let val = -Infinity;
  for (const [k, v] of Object.entries(rec)) {
    if (v > val) {
      val = v;
      best = k;
    }
  }
  return best;
}

function scoreFromAnswers(
  config: TestConfig,
  answers: Array<{ qid: string; answer_key: string }>
) {
  const flows: Record<string, number> = {};
  const profiles: Record<string, number> = {};
  let answered = 0;

  const byQ = new Map(answers.map((a) => [a.qid, a.answer_key]));

  for (const q of config.questions) {
    const key = byQ.get(q.id);
    if (!key) continue;
    const opt = q.options.find((o) => o.key === key);
    if (!opt || !opt.weight) continue; // skip non-scored (e.g., Q16–Q20)
    answered++;

    if (opt.weight.flows) {
      for (const [f, v] of Object.entries(opt.weight.flows)) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) flows[f] = (flows[f] ?? 0) + n;
      }
    }
    if (opt.weight.profiles) {
      for (const [p, v] of Object.entries(opt.weight.profiles)) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) profiles[p] = (profiles[p] ?? 0) + n;
      }
    }
  }

  const frequency = topKey(flows);
  const profile = topKey(profiles);
  const total_score =
    Object.values(flows).reduce((a, b) => a + b, 0) +
    Object.values(profiles).reduce((a, b) => a + b, 0);

  return {
    profile,
    frequency,
    total_score,
    scores: { flows, profiles },
    answered,
  };
}

// --- route -----------------------------------------------------------------

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = supabaseServer();

  // 1) Try the submission row first (fast path)
  {
    const { data, error } = await db
      .from("mc_submissions")
      .select(
        "id,test_id,full_profile_code,full_frequency,total_score,scores_json"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && (data.full_profile_code || data.full_frequency || data.scores_json)) {
      return NextResponse.json({
        source: "mc_submissions",
        result: {
          profile: data.full_profile_code ?? null,
          frequency: data.full_frequency ?? null,
          total_score: data.total_score ?? undefined,
          scores: (data.scores_json as Record<string, unknown> | null) ?? null,
        },
      });
    }
  }

  // 2) Not scored yet — compute from answers if possible
  // 2a) fetch answers + resolve the test slug (from tests table)
  const subq = db
    .from("mc_submissions")
    .select("test_id")
    .eq("id", id)
    .maybeSingle();
  const ansq = db
    .from("mc_answers")
    .select("qid,answer_key")
    .eq("submission_id", id);

  const [{ data: sub, error: subErr }, { data: answers, error: ansErr }] =
    await Promise.all([subq, ansq]);

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }
  if (ansErr) {
    return NextResponse.json({ error: ansErr.message }, { status: 500 });
  }

  const testId = sub?.test_id as string | null;

  // Resolve slug (if you keep a `tests` table)
  let slug: string | null = null;
  if (isStr(testId)) {
    const { data: testRow } = await db
      .from("tests")
      .select("slug")
      .eq("id", testId)
      .maybeSingle();
    slug = testRow?.slug ?? null;
  }

  if (!slug || !answers?.length) {
    // nothing to compute with
    return NextResponse.json({ source: "pending", result: null });
  }

  const config = getTestConfig(slug);
  if (!config) {
    return NextResponse.json({
      source: "pending",
      result: null,
      error: `No test config for slug ${slug}`,
    });
  }

  const computed = scoreFromAnswers(config, answers as Array<{ qid: string; answer_key: string }>);

  // 3) Persist back on mc_submissions so future reads are fast
  await db
    .from("mc_submissions")
    .update({
      full_profile_code: computed.profile,
      full_frequency: computed.frequency,
      total_score: computed.total_score,
      scores_json: computed.scores as unknown as object,
      taken_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({
    source: "computed",
    result: {
      profile: computed.profile,
      frequency: computed.frequency,
      total_score: computed.total_score,
      scores: computed.scores,
      raw: { answered: computed.answered },
    },
  });
}
