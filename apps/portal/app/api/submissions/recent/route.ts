// apps/portal/app/api/submissions/recent/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Tweak these to match your schema if needed
const TABLE_CANDIDATES = ["mc_submissions", "test_results"] as const;
const ID_COL_CANDIDATES = [
  "submission_id",
  "submissionId",
  "mc_submission_id",
  "submission",
  "id",
] as const;

type Row = Record<string, unknown>;
type SubmissionRow = Row & { id?: string | number };

async function getById(
  db: SupabaseClient,
  table: string,
  id: string
): Promise<Row | null> {
  for (const col of ID_COL_CANDIDATES) {
    const r = await db.from(table).select("*").eq(col, id).limit(1).maybeSingle();
    if (!r.error && r.data) return r.data as Row;
  }
  return null;
}

/**
 * GET /api/submissions/recent
 * Returns a small list of recent submissions plus a best-effort detail lookup.
 * Query params:
 *   - limit (number, optional; default 10)
 */
export async function GET(req: Request) {
  try {
    const db = supabaseServer; // client object

    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);

    // Pull recent submissions
    const base = await db
      .from("mc_submissions")
      .select(
        [
          "id",
          "taken_at",
          "email",
          "first_name",
          "last_name",
          "full_profile_code",
          "full_frequency",
          "test_id",
        ].join(",")
      )
      .order("taken_at", { ascending: false })
      .limit(limit);

    if (base.error) {
      return NextResponse.json(
        { ok: false, error: base.error.message },
        { status: 500 }
      );
    }

    // ---- SAFE NARROWING ----
    // Treat unknown results defensively; filter out any non-object or "error" sentinel shapes.
    const dataAny = Array.isArray(base.data) ? (base.data as unknown[]) : [];
    const rows: SubmissionRow[] = dataAny.filter((r): r is SubmissionRow => {
      if (!r || typeof r !== "object") return false;
      // Some environments surface "GenericStringError" shapes; skip anything with an `error` key.
      return !("error" in (r as Record<string, unknown>));
    });

    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const rawId = row?.id ?? "";
        const id = String(rawId || "");
        let detail: Row | null = null;
        if (id) {
          for (const t of TABLE_CANDIDATES) {
            detail = await getById(db, t, id);
            if (detail) break;
          }
        }
        return { ...row, detail };
      })
    );

    return NextResponse.json({ ok: true, rows: hydrated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
