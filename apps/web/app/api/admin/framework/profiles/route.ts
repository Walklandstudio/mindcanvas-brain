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

  // LEFT JOIN to include approved status
  const { data, error } = await supabase
    .rpc("mc_get_profiles_with_approved", { p_org_id: orgId, p_fw_id: frameworkId });
  if (error && error.code !== "PGRST204") {
    // Fallback if RPC missing: do it in two calls
    const { data: profiles } = await supabase
      .from("org_profiles")
      .select("id,name,frequency,ordinal")
      .eq("org_id", orgId).eq("framework_id", frameworkId).order("ordinal");
    const { data: reports } = await supabase
      .from("org_profile_reports")
      .select("profile_id,approved")
      .eq("org_id", orgId).eq("framework_id", frameworkId);

    const map = new Map((reports ?? []).map(r => [r.profile_id, r.approved]));
    const merged = (profiles ?? []).map(p => ({ ...p, approved: !!map.get(p.id) }));
    return NextResponse.json({ frameworkId, profiles: merged });
  }

  return NextResponse.json({ frameworkId, profiles: data ?? [] });
}
