import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/** Minimal shape we return to the client */
type RecentRow = {
  submission_id: string;
  created_at?: string | null;
  profile?: string | null;
  frequency?: string | null;
  test_slug?: string | null;
  org_slug?: string | null;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function coerceRows(x: unknown): RecentRow[] {
  if (!Array.isArray(x)) return [];
  const out: RecentRow[] = [];
  for (const r of x) {
    if (!isRecord(r)) continue;
    const id = r["submission_id"];
    if (typeof id !== "string") continue;
    out.push({
      submission_id: id,
      created_at: r["created_at"] ? String(r["created_at"]) : null,
      profile: typeof r["profile"] === "string" ? r["profile"] : null,
      frequency: typeof r["frequency"] === "string" ? r["frequency"] : null,
      test_slug: typeof r["test_slug"] === "string" ? r["test_slug"] : null,
      org_slug: typeof r["org_slug"] === "string" ? r["org_slug"] : null,
    });
  }
  return out;
}

/**
 * GET /api/submissions/recent?limit=10&org=competency-coach&test=<slug>
 * Lists recent submissions from test_results (fallback: v_results_latest).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "10");
  const org = url.searchParams.get("org") ?? undefined;
  const test = url.searchParams.get("test") ?? undefined;
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitParam) ? limitParam : 10));

  const db = supabaseServer();

  // --- 1) try canonical table: test_results ---
  let data: RecentRow[] | null = null;
  let errorMsg: string | null = null;

  try {
    let q = db
      .from("test_results")
      .select("submission_id, created_at, profile, frequency, test_slug, org_slug")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (org) q = q.eq("org_slug", org);
    if (test) q = q.eq("test_slug", test);

    const res = await q;
    if (res.error) {
      // Keep the message but we will try a fallback
      errorMsg = String(res.error.message ?? "");
    } else {
      data = coerceRows(res.data);
    }
  } catch (e) {
    errorMsg = String((e as Error).message ?? "");
  }

  // --- 2) fallback to view if table empty or filtered columns not present ---
  if (!data || data.length === 0) {
    const view = await db
      .from("v_results_latest")
      .select("submission_id, created_at, profile, frequency")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!view.error) {
      data = coerceRows(view.data);
      errorMsg = null; // successful fallback
    } else if (!errorMsg) {
      errorMsg = String(view.error.message ?? "");
    }
  }

  if (errorMsg && (!data || data.length === 0)) {
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rows: data ?? [],
  });
}
