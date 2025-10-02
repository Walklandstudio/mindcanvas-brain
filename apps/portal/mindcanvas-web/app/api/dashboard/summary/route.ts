/* app/api/dashboard/summary/route.ts */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Returns totals for:
 * - submissions in the last N days (default 30)
 * - unique clients in the last N days
 * Optional query param: ?days=7|30|90
 * Optional query param: ?test=slug (if you later add test_slug, otherwise we just ignore the filter)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? 30);
    const fromISO = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const test = url.searchParams.get("test") || ""; // kept for forward compatibility

    // Submissions count
    const { count: submissionsCount, error: subErr } = await supabase
      .from("mc_submissions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromISO);

    if (subErr) throw subErr;

    // Unique clients (by email if present, else by submission id as a fallback)
    const { data: uniqRows, error: uniqErr } = await supabase
      .from("mc_submissions")
      .select("id, email")
      .gte("created_at", fromISO);

    if (uniqErr) throw uniqErr;

    const uniq = new Set(
      (uniqRows ?? []).map((r: any) => (r.email?.trim()?.toLowerCase() || `sid:${r.id}`))
    ).size;

    return NextResponse.json({
      ok: true,
      days,
      submissions: submissionsCount ?? 0,
      unique_clients: uniq,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
