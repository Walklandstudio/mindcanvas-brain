import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractIdFromUrl } from "@/lib/routeParams";

type Row = Record<string, unknown>;
function isObj(x: unknown): x is Record<string, unknown> { return typeof x === "object" && x !== null; }

const ID_COL_CANDIDATES = ["submission_id","submissionId","mc_submission_id","submission","id"] as const;

async function getById(db: ReturnType<typeof supabaseServer>, table: string, id: string): Promise<Row | null> {
  for (const col of ID_COL_CANDIDATES) {
    try {
      const r = await db.from(table).select("*").eq(col, id).limit(1).maybeSingle();
      if (!r.error && r.data) return r.data as Row;
    } catch { /* ignore */ }
  }
  return null;
}

export async function GET(req: Request) {
  const id = extractIdFromUrl(req.url);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseServer();

  // 1) Try your results store(s)
  let resultRow = await getById(db, "test_results", id);
  if (!resultRow) resultRow = await getById(db, "v_results_latest", id);

  if (resultRow) {
    return NextResponse.json({ ok: true, pending: false, source: "results", result: resultRow });
  }

  // 2) Use mc_submissions as a result source if it has scoring fields
  const sub = await db.from("mc_submissions").select("*").eq("id", id).limit(1).maybeSingle();
  if (sub.error) return NextResponse.json({ error: sub.error.message }, { status: 500 });
  if (!sub.data) return NextResponse.json({ error: "Submission not found in mc_submissions" }, { status: 404 });

  const s = sub.data as Row;
  const hasScoring =
    typeof s["full_profile_code"] === "string" ||
    typeof s["full_frequency"] === "string" ||
    isObj(s["scores_json"]);

  if (hasScoring) {
    const normalized = {
      submission_id: id,
      profile: typeof s["full_profile_code"] === "string" ? (s["full_profile_code"] as string) : null,
      frequency: typeof s["full_frequency"] === "string" ? (s["full_frequency"] as string) : null,
      scores: isObj(s["scores_json"]) ? (s["scores_json"] as Record<string, unknown>) : null,
      total_score: typeof s["total_score"] === "number" ? (s["total_score"] as number) : null,
      raw: s,
    };
    return NextResponse.json({ ok: true, pending: false, source: "mc_submissions", result: normalized });
  }

  // 3) Submission exists but has no scoring yet
  return NextResponse.json({ ok: true, pending: true, submission: s, result: null });
}
