// app/api/submissions/[id]/finish/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractIdFromUrl } from "@/lib/routeParams";
import { getTestConfig, type TestConfig } from "@/lib/testConfigs";

type Body = { slug: string; answers: Record<string, string> };

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function topKey(rec: Record<string, number>): string | null {
  let best: string | null = null, val = -Infinity;
  for (const [k, v] of Object.entries(rec)) if (v > val) { val = v; best = k; }
  return best;
}

function score(config: TestConfig, answers: Record<string, string>) {
  const flows: Record<string, number> = {};
  const profiles: Record<string, number> = {};
  let answered = 0;

  for (const q of config.questions) {
    const sel = answers[q.id];
    if (!sel) continue;
    const opt = q.options.find((o) => o.key === sel);
    if (!opt) continue;

    // Only weighted options count for scoring
    const w = opt.weight;
    if (!w) continue;

    answered++;

    if (w.flows) for (const [k, v] of Object.entries(w.flows)) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) flows[k] = (flows[k] ?? 0) + n;
    }
    if (w.profiles) for (const [k, v] of Object.entries(w.profiles)) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) profiles[k] = (profiles[k] ?? 0) + n;
    }
  }

  const full_frequency = topKey(flows);
  const full_profile_code = topKey(profiles);
  const total_score =
    Object.values(flows).reduce((a, b) => a + b, 0) +
    Object.values(profiles).reduce((a, b) => a + b, 0);

  return { full_frequency, full_profile_code, scores_json: { flows, profiles }, total_score, answered };
}

export async function POST(req: Request) {
  const id = extractIdFromUrl(req.url);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let b: Body;
  try {
    const raw: unknown = await req.json();
    if (!isObj(raw)) throw new Error("bad body");
    const slug = raw["slug"];
    const answers = raw["answers"];
    if (typeof slug !== "string") throw new Error("Missing slug");
    if (!isObj(answers)) throw new Error("Missing answers");
    b = { slug, answers: answers as Record<string, string> };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const config = getTestConfig(b.slug);
  if (!config) return NextResponse.json({ error: "Unknown test slug" }, { status: 400 });

  // 1) Score weighted questions
  const scored = score(config, b.answers);

  // 2) Extract qualification answers (no weight) for Q16–Q20
  const qualRows = config.questions
    .filter((q) => q.id >= "q16" && q.id <= "q20") // your IDs are "q16"..."q20"
    .map((q) => {
      const key = b.answers[q.id];
      if (!key) return null;
      const opt = q.options.find((o) => o.key === key);
      if (!opt) return null;
      // Skip if this option actually has weight (defensive)
      if (opt.weight) return null;
      return {
        submission_id: id,
        qid: q.id,
        answer_key: key,
        answer_label: opt.label,
      };
    })
    .filter((r): r is { submission_id: string; qid: string; answer_key: string; answer_label: string } => !!r);

  const db = supabaseServer();

  // 3) Persist scored fields on the submission
  {
    const { error } = await db
      .from("mc_submissions")
      .update({
        full_profile_code: scored.full_profile_code,
        full_frequency: scored.full_frequency,
        scores_json: scored.scores_json as unknown as object,
        total_score: scored.total_score,
        taken_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4) Upsert qualification answers (if any)
  if (qualRows.length) {
    const { error } = await db
      .from("mc_qualification_answers")
      .upsert(
        qualRows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: "submission_id,qid" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, ...scored, qualifications_saved: qualRows.length });
}

