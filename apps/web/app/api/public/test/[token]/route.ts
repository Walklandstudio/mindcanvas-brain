// apps/web/app/api/public/test/[token]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

/** Extract the token from the request URL (no context arg needed) */
function extractTokenFromUrl(req: Request): string {
  const url = new URL(req.url);
  // /api/public/test/<token> -> last segment is the token
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

/**
 * GET: basic meta for public landing (/t/[token])
 * Returns: { ok:boolean, data?: { name, test_id, token }, error? }
 */
export async function GET(req: Request) {
  const token = extractTokenFromUrl(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: link } = await sb
    .from("test_links")
    .select("id, token, org_id, test_id")
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });
  }

  // Try org_tests first; fall back to legacy tests
  let testName: string | null = null;

  const { data: orgTest } = await sb
    .from("org_tests")
    .select("id, name")
    .eq("id", (link as any).test_id)
    .maybeSingle();

  if (orgTest?.name) {
    testName = orgTest.name as any;
  } else {
    const { data: legacyTest } = await sb
      .from("tests")
      .select("id, name")
      .eq("id", (link as any).test_id)
      .maybeSingle();
    testName = (legacyTest as any)?.name ?? "Test";
  }

  return NextResponse.json({
    ok: true,
    data: { name: testName, test_id: (link as any).test_id, token: (link as any).token },
  });
}

/**
 * POST: upsert taker info (from the pre-start form) and return taker id
 * Body fields used: first_name, last_name, email (others ignored for now)
 * Returns: { ok:boolean, id?: string, error? }
 */
export async function POST(req: Request) {
  const token = extractTokenFromUrl(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));

  const { data: link } = await sb
    .from("test_links")
    .select("id, org_id, test_id")
    .eq("token", token)
    .maybeSingle();
  if (!link) {
    return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });
  }

  const email: string = body?.email ?? "";
  const name =
    [body?.first_name, body?.last_name].filter(Boolean).join(" ").trim() || null;

  let takerId: string | null = null;
  if (email) {
    const { data: taker, error: te } = await sb
      .from("test_takers")
      .upsert([{ org_id: (link as any).org_id, email, name }], { onConflict: "org_id,email" })
      .select("id")
      .maybeSingle();
    if (te) return NextResponse.json({ ok: false, error: te.message }, { status: 400 });
    takerId = (taker as any)?.id ?? null;
  }

  return NextResponse.json({ ok: true, id: takerId });
}
