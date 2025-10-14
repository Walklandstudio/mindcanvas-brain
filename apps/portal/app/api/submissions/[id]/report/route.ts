// apps/portal/app/api/submissions/[id]/report/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * GET /api/submissions/[id]/report
 * Returns the test_results row for the given submission id.
 * Adjust table/columns as needed to match your schema.
 */
export async function GET(_req: Request, ctx: any) {
  try {
    const id = (ctx?.params?.id ?? "") as string;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    // Use Supabase server client directly (no parentheses)
    const db = supabaseServer;

    const tr = await db
      .from("test_results")
      .select("*")
      .eq("submission_id", id)
      .limit(1)
      .maybeSingle();

    if (tr.error) {
      return NextResponse.json({ ok: false, error: tr.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: tr.data ?? null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
