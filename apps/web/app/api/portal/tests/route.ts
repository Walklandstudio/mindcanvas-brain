// apps/web/app/api/portal/tests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)!,
    { auth: { persistSession: false }, db: { schema: "portal" } }
  );

  const { searchParams } = new URL(req.url);
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
      .select("id, name, slug, org_id")
      .order("name", { ascending: true });
    if (orgId) q.eq("org_id", orgId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tests: data ?? [], orgSlug: slug });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
