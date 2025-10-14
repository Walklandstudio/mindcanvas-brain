// apps/portal/app/api/tests/submissions/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * GET /api/tests/submissions?testId=<uuid>
 *   - also accepts ?id=<uuid> as an alias
 *   - optional ?limit=<n> (default 50, 1..200)
 *
 * Response: { ok: true, rows: [...] } or { ok: false, error: string }
 */
export async function GET(req: Request) {
  try {
    const db = supabaseServer; // NOTE: client object, do NOT call as a function

    const url = new URL(req.url);
    const testId = (url.searchParams.get("testId") || url.searchParams.get("id") || "").trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

    if (!testId) {
      return NextResponse.json(
        { ok: false, error: "Missing testId" },
        { status: 400 }
      );
    }

    const sel = [
      "id",
      "taken_at",
      "email",
      "first_name",
      "last_name",
      "full_profile_code",
      "full_frequency",
      "test_id",
    ].join(",");

    const { data, error } = await db
      .from("mc_submissions")
      .select(sel)
      .eq("test_id", testId)
      .order("taken_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

