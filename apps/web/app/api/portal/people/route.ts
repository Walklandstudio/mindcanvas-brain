// GET: list takers | POST: upsert a taker
import { NextResponse } from "next/server";
import { getActiveOrgId, supabaseServer } from "@/app/_lib/portal";

export async function GET() {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 401 });

  const { data, error } = await supabase
    .from("test_takers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ takers: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { email, full_name } = body;
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { data, error } = await supabase
    .from("test_takers")
    .upsert([{ org_id: orgId, email, full_name }], { onConflict: "org_id,email" })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ taker: data });
}
