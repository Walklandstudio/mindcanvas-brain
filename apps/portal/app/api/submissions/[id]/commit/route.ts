// apps/portal/app/api/submissions/[id]/commit/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * Marks a submission as "committed" (adjust to your schema as needed).
 * Expects the dynamic route param `[id]`.
 */
export async function POST(req: Request, ctx: any) {
  try {
    const id = (ctx?.params?.id ?? "") as string;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    // Use Supabase server client directly (do NOT call as a function)
    const db = supabaseServer;

    // Example: read the submission
    const { data: sub, error: readErr } = await db
      .from("mc_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readErr) {
      return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
    }
    if (!sub) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Example: mark as committed (adjust column names to match your schema)
    const { error: updErr } = await db
      .from("mc_submissions")
      .update({ committed_at: new Date().toISOString(), committed: true })
      .eq("id", id);

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
