// apps/portal/app/api/dashboard/export/submissions/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * Export submissions (simple JSON).
 * Adjust the `select` to match your schema exactly.
 */
export async function GET() {
  try {
    // Use the Supabase server client directly (do NOT call as a function)
    const db = supabaseServer;

    const { data, error } = await db
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
      .order("taken_at", { ascending: false });

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
