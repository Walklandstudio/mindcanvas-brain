import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org"); // org slug is required

  if (!org) {
    return NextResponse.json({ error: "Missing org slug" }, { status: 400 });
  }

  // resolve org slug -> id
  const { data: orgRow, error: orgErr } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", org)
    .maybeSingle();

  if (orgErr || !orgRow) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  const { data: tests, error } = await supabase
    .from("tests")
    .select("id, name, slug, is_active, kind")
    .eq("org_id", orgRow.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ org: orgRow, tests: tests ?? [] });
}
