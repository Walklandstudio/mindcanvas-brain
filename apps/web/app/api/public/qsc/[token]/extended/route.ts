// apps/web/app/api/public/qsc/[token]/extended/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    db: { schema: "portal" },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const client = supa();

  // 1) Load the QSC result row for this token
  const { data: result, error: resultError } = await client
    .from("qsc_results")
    .select(
      `
      id,
      test_id,
      token,
      personality_totals,
      personality_percentages,
      mindset_totals,
      mindset_percentages,
      primary_personality,
      secondary_personality,
      primary_mindset,
      secondary_mindset,
      combined_profile_code,
      qsc_profile_id,
      created_at
    `
    )
    .eq("token", token)
    .maybeSingle();

  if (resultError) {
    console.error("[QSC extended] error loading qsc_results:", resultError);
    return NextResponse.json(
      { ok: false, error: "Unable to load QSC results" },
      { status: 500 }
    );
  }

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "Result not found" },
      { status: 404 }
    );
  }

  // 2) Load the QSC profile row (base snapshot content)
  let profile: any = null;

  if (result.qsc_profile_id) {
    const { data, error } = await client
      .from("qsc_profiles")
      .select(
        `
        id,
        personality_code,
        mindset_level,
        profile_code,
        profile_label,
        how_to_communicate,
        decision_style,
        business_challenges,
        trust_signals,
        offer_fit,
        sale_blockers,
        full_internal_insights
      `
      )
      .eq("id", result.qsc_profile_id)
      .maybeSingle();

    if (error) {
      console.error("[QSC extended] error loading qsc_profile by id:", error);
    } else {
      profile = data;
    }
  }

  // Fallback lookup if qsc_profile_id is missing
  if (!profile && result.combined_profile_code) {
    const { data, error } = await client
      .from("qsc_profiles")
      .select(
        `
        id,
        personality_code,
        mindset_level,
        profile_code,
        profile_label,
        how_to_communicate,
        decision_style,
        business_challenges,
        trust_signals,
        offer_fit,
        sale_blockers,
        full_internal_insights
      `
      )
      .eq("profile_code", result.combined_profile_code)
      .maybeSingle();

    if (error) {
      console.error(
        "[QSC extended] error loading qsc_profile by profile_code:",
        error
      );
    } else {
      profile = data;
    }
  }

  // 3) Overlay the full Extended Source Code from entrepreneur_owner_insights
  //    based on persona combo A1–D5.
  if (profile?.personality_code && profile?.mindset_level) {
    const comboCode = `${profile.personality_code}${profile.mindset_level}`;

    const { data: ownerRow, error: ownerError } = await client
      .from("qsc_entrepreneur_owner_insights")
      .select(
        `
        combo_code,
        extended_source_code
      `
      )
      .eq("combo_code", comboCode)
      .maybeSingle();

    if (ownerError) {
      console.error(
        "[QSC extended] error loading entrepreneur_owner_insights:",
        ownerError
      );
    } else if (ownerRow?.extended_source_code) {
      profile = {
        ...profile,
        full_internal_insights: ownerRow.extended_source_code,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    results: result,
    profile,
  });
}
