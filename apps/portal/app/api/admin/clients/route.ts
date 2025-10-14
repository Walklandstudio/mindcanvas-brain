// apps/portal/app/api/admin/clients/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ensure this API is never statically analyzed
export const revalidate = 0;

/**
 * GET /api/admin/clients
 * Optional query params:
 *  - q: search term (matches name/email contains)
 *  - limit: number (1..200, default 50)
 *  - offset: number (0..10000, default 0)
 *
 * Response shape is always build-safe:
 *   { ok: true, rows: [...], total?: number, note?: string, message?: string }
 *   or { ok: false, error: string }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
    const offset = Math.min(Math.max(Number(url.searchParams.get("offset") ?? 0), 0), 10_000);

    // Lazy import so build doesn’t choke if env isn’t wired
    const { supabaseServer } = await import("@/lib/supabaseServer");
    const db = supabaseServer; // NOTE: client object, do NOT call as a function

    // Base select — adjust columns to your schema
    const base = db
      .from("mc_clients")
      .select(
        [
          "id",
          "name",
          "email",
          "created_at",
          "updated_at",
        ].join(","),
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Simple search
    const query = q
      ? base.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      : base;

    const { data, error, count } = await query;

    if (error) {
      // Don’t fail build: return a soft success with diagnostic note
      return NextResponse.json(
        { ok: true, rows: [], total: 0, note: "query_error", message: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, rows: data ?? [], total: count ?? 0 }, { status: 200 });
  } catch (err: unknown) {
    // If Supabase (or env) isn’t available at build time, still succeed
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: true, rows: [], total: 0, note: "supabase_unavailable", message: msg },
      { status: 200 }
    );
  }
}
