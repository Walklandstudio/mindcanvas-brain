import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractIdFromUrl } from "@/lib/routeParams";
import { getTestConfig, TestConfig } from "@/lib/testConfigs";

type Body = {
  slug: string;
  answers: Record<string, string>; // { [questionId]: optionKey }
};

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function topKey(rec: Record<string, number>): string | null {
  let best: string | null = null;
  let val = -Infinity;
  for (const [k, v] of Object.entries(rec)) {
    if (v > val) { val = v; best = k; }
  }
  return best;
}

function score(config: TestConfig, answers: Record<string, string>) {
  const flows: Record<string, number> = {};
  const profiles: Record<string, number> = {};
  let answered = 0;

  for (const q of config.questions) {
    const sel = answers[q.id];
    if (!sel) continue;
    const opt = q.options.find(o => o.key === sel);
    if (!opt) continue;
    answered++;

    if (opt.weight.flows) {
      for (const [k, v] of Object.entries(opt.weight.flows)) {
        flows[k] = (flows[k] ?? 0) + v;
      }
    }
    if (opt.weight.profiles) {
      for (const [k, v] of Object.entries(opt.weight.profiles)) {
        profiles[k] = (profiles[k] ?? 0) + v;
      }
    }
  }

  const full_frequency = topKey(flows) ?? null;
  const full_profile_code = topKey(profiles) ?? null;
  const total_score = Object.values(flows).reduce((a, b) => a + b, 0)
    + Object.values(profiles).reduce((a, b) => a + b, 0);

  return {
    full_frequency,
    full_profile_code,
    scores_json: { flows, profiles },
    total_score,
    answered,
  };
}

export async function POST(req: Request) {
  const id = extractIdFromUrl(req.url);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let b: Body | null = null;
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

  const scored = score(config, b.answers);

  const db = supabaseServer();
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

  return NextResponse.json({ ok: true, id, ...scored });
}

