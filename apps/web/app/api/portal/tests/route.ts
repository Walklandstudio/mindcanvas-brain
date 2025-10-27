import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { searchParams } = new URL(req.url);
  // slug is OPTIONAL now (back-compat)
  const slug = searchParams.get("org") || req.cookies.get("active_org_slug")?.value || null;

  try {
    let orgId: string | null = null;

    if (slug) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      orgId = org?.id ?? null;
    }

    const q = supabase
      .from("tests")
      .select("id, name, slug, is_active, kind")
      .order("created_at", { ascending: false });

    if (orgId) q.eq("org_id", orgId);

    const { data: tests, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tests: tests ?? [], orgSlug: slug ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
