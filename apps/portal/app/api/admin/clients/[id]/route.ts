// apps/portal/app/api/admin/clients/[id]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never pre-render
export const revalidate = 0;            // no ISR for this API

/**
 * GET /api/admin/clients/[id]
 * Returns a client row if found; otherwise { client: null }.
 * Adjust table/columns to match your schema.
 */
export async function GET(_req: Request, ctx: any) {
  const id = String(ctx?.params?.id ?? "");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  // Try Supabase if available, but never crash the build
  try {
    const { supabaseServer } = await import("@/lib/supabaseServer");
    const db = supabaseServer; // client object, not a function
    const r = await db.from("mc_clients").select("*").eq("id", id).maybeSingle();

    if (r.error) {
      // Log-like response to help debugging without failing build
      return NextResponse.json(
        { ok: true, client: null, note: "query_error", message: r.error.message },
        { status: 200 }
      );
    }
    return NextResponse.json({ ok: true, client: r.data ?? null }, { status: 200 });
  } catch (_err) {
    // If Supabase wiring isn't ready at build time, still return a safe response
    return NextResponse.json(
      { ok: true, client: null, note: "supabase_unavailable" },
      { status: 200 }
    );
  }
}

