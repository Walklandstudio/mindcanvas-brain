import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractIdFromUrl } from "@/lib/routeParams";

type Row = Record<string, unknown>;

const ID_COL_CANDIDATES = [
  "submission_id",
  "submissionId",
  "mc_submission_id",
  "submission",
  "id",
] as const;

async function getById(
  db: ReturnType<typeof supabaseServer>,
  table: string,
  id: string
): Promise<Row | null> {
  for (const col of ID_COL_CANDIDATES) {
    try {
      const r = await db.from(table).select("*").eq(col, id).limit(1).maybeSingle();
      if (!r.error && r.data) return r.data as Row;
    } catch {
      // ignore ("column ... does not exist") and continue
    }
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
    return NextResponse.json({ ok: true, pending: false, result: resultRow });
  }

  // 2) Fallback: show the submission exists (no 'created_at' field assumptions)
  const sub = await db
    .from("mc_submissions")
    .select("*") // <- no created_at, returns whatever columns you actually have
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (sub.error) {
    return NextResponse.json({ error: sub.error.message }, { status: 500 });
  }
  if (!sub.data) {
    return NextResponse.json(
      { error: "Submission not found in mc_submissions" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    submission: sub.data, // lets callers know the submission exists, but no result stored (yet)
    result: null,
  });
}
