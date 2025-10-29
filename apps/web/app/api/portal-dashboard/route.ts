import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgSlug = searchParams.get("orgSlug");
    const testId = searchParams.get("testId");
    if (!orgSlug || !testId) {
      return NextResponse.json({ error: "Missing orgSlug or testId" }, { status: 400 });
    }

    const supabase = createClient();

    const freq = await supabase
      .from("portal.v_dashboard_avg_frequency")
      .select("frequency_code, frequency_name, avg_points")
      .eq("org_slug", orgSlug)
      .eq("test_id", testId);

    const prof = await supabase
      .from("portal.v_dashboard_avg_profile")
      .select("profile_code, profile_name, avg_points")
      .eq("org_slug", orgSlug)
      .eq("test_id", testId);

    const top3 = await supabase
      .from("portal.v_dashboard_top3_profiles")
      .select("profile_code, profile_name, avg_points")
      .eq("org_slug", orgSlug)
      .eq("test_id", testId);

    const low3 = await supabase
      .from("portal.v_dashboard_bottom3_profiles")
      .select("profile_code, profile_name, avg_points")
      .eq("org_slug", orgSlug)
      .eq("test_id", testId);

    const overall = await supabase
      .from("portal.v_dashboard_overall_avg")
      .select("overall_avg")
      .eq("org_slug", orgSlug)
      .eq("test_id", testId)
      .single();

    if (freq.error || prof.error || top3.error || low3.error || overall.error) {
      return NextResponse.json(
        { error: "Dashboard query failed", details: { freq: freq.error, prof: prof.error, top3: top3.error, low3: low3.error, overall: overall.error } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      frequencies: freq.data ?? [],
      profiles: prof.data ?? [],
      top3: top3.data ?? [],
      low3: low3.data ?? [],
      overall: overall.data ?? { overall_avg: 0 },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
