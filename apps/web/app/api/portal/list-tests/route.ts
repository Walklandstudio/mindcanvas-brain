import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Minimal env check so we return JSON instead of crashing
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const slug = new URL(req.url).searchParams.get("org"); // optional
  try {
    let orgId: string | null = null;

    if (slug) {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (orgErr) return NextResponse.json({ error: `Org lookup failed: ${orgErr.message}` }, { status: 500 });
      if (!org)   return NextResponse.json({ error: `Org not found for slug: ${slug}` }, { status: 404 });
      orgId = org.id;
    }

    const q = supabase
      .from("tests")
      .select("id, name, slug, is_active, kind, org_id")
      .order("created_at", { ascending: false });

    if (orgId) q.eq("org_id", orgId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: `Tests query failed: ${error.message}` }, { status: 500 });

    return NextResponse.json({ tests: data ?? [], org: slug ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
