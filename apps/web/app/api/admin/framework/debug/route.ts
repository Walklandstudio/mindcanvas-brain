// apps/web/app/api/admin/framework/debug/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const supabase = getServiceClient();

  const fw = await supabase
    .from("org_frameworks")
    .select("id,frequency_meta")
    .eq("org_id", ORG_ID)
    .maybeSingle();

  if (fw.error) {
    return NextResponse.json({ error: fw.error.message }, { status: 500 });
  }

  const frameworkId = fw.data?.id || null;

  let profiles: any[] = [];
  let pErr: string | null = null;

  if (frameworkId) {
    const resp = await supabase
      .from("org_profiles")
      .select("id,name,frequency,ordinal")
      .eq("org_id", ORG_ID)
      .eq("framework_id", frameworkId)
      .order("ordinal", { ascending: true });
    pErr = resp.error?.message || null;
    profiles = resp.data || [];
  }

  return NextResponse.json({
    framework_id: frameworkId,
    frequency_meta_letters: fw.data?.frequency_meta ? Object.keys(fw.data.frequency_meta) : [],
    profiles_count: profiles.length,
    profiles,
    profiles_error: pErr,
  });
}
