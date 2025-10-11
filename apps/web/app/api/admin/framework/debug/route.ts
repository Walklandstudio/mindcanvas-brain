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

  const frameworkId = fw.data?.id || "";

  const profiles = frameworkId
    ? await supabase
        .from("org_profiles")
        .select("id,name,frequency,ordinal")
        .eq("org_id", ORG_ID)
        .eq("framework_id", frameworkId)
        .order("ordinal", { ascending: true })
    : { data: [], error: null };

  return NextResponse.json({
    fw_error: fw.error?.message || null,
    framework_id: frameworkId || null,
    frequency_meta_keys: fw.data?.frequency_meta ? Object.keys(fw.data.frequency_meta) : [],
    profiles_error: (profiles as any).error?.message || null,
    profiles_count: (profiles as any).data?.length || 0,
    profiles: (profiles as any).data || [],
  });
}
