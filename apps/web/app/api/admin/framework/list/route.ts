import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

  const supabase = createClient(url, service, { auth: { persistSession: false } });

  const { data: fw, error: fwErr } = await supabase
    .from("org_frameworks").select("id").eq("org_id", orgId).limit(1).maybeSingle();
  if (fwErr) return NextResponse.json({ error: fwErr.message }, { status: 500 });
  const frameworkId = fw?.id ?? null;

  if (!frameworkId) return NextResponse.json({ frameworkId: null, profiles: [] });

  const { data: profiles, error: pErr } = await supabase
    .from("org_profiles")
    .select("id,name,frequency,ordinal,image_url")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .order("ordinal", { ascending: true });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ frameworkId, profiles: profiles ?? [] });
}
