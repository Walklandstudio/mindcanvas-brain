import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractIdFromUrl } from "@/lib/routeParams";

type Row = Record<string, unknown>;

export async function GET(req: Request) {
  const id = extractIdFromUrl(req.url);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseServer();

  // 1) Try canonical results table with flexible ID column guesses
  const idCols = ["submission_id", "submissionId", "mc_submission_id", "submission", "id"] as const;
  let resultRow: Row | null = null;

  for (const col of idCols) {
    try {
      const res = await db.from("test_results").select("*").eq(col, id).limit(1).maybeSingle();
      if (!res.error && res.data) {
        resultRow = res.data as Row;
        break;
      }
    } catch { /* ignore and try next column */ }
  }

  // 2) Fallback view (if present) with same guesses
  if (!resultRow) {
    for (const col of idCols) {
      try {
        const res = await db.from("v_results_latest").select("*").eq(col, id).limit(1).maybeSingle();
        if (!res.error && res.data) {
          resultRow = res.data as Row;
          break;
        }
      } catch { /* ignore */ }
    }
  }

  // 3) If still nothing, return the submission row so the caller knows it exists
  if (!resultRow) {
    const sub = await db
      .from("mc_submissions")
      .select("id, created_at, first_name, last_name, email, test_id, org_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (sub.error) return NextResponse.json({ error: sub.error.message }, { status: 500 });
    if (!sub.data) {
      return NextResponse.json(
        { error: "Submission not found in mc_submissions" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      pending: true,
      submission: sub.data,
      result: null,
    });
  }

  return NextResponse.json({ ok: true, pending: false, result: resultRow });
}
