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

  // 1) Load the QSC result row
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

  // 2) Load the QSC profile row (snapshot persona)
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
        sale_blockers
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

  // Fallback: lookup by combined_profile_code if needed
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
        sale_blockers
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

  // 3) Load the structured Extended Source Code row from portal.qsc_entrepreneur_extended_reports
  let extended: any = null;

  if (profile?.profile_code) {
    const { data, error } = await client
      .from("qsc_entrepreneur_extended_reports")
      .select(
        `
        personality_code,
        personality_label,
        mindset_label,
        mindset_level,
        profile_code,
        persona_label,
        personality_layer,
        mindset_layer,
        combined_quantum_pattern,
        how_to_communicate,
        how_they_make_decisions,
        core_business_problems,
        what_builds_trust,
        what_offer_ready_for,
        what_blocks_sale,
        pre_call_questions,
        micro_scripts,
        green_red_flags,
        real_life_example,
        final_summary
      `
      )
      .eq("profile_code", profile.profile_code)
      .maybeSingle();

    if (error) {
      console.error(
        "[QSC extended] error loading entrepreneur_extended_reports by profile_code:",
        error
      );
    } else {
      extended = data;
    }
  }

  // Fallback: match by personality_code + mindset_level if profile_code is missing
  if (!extended && profile?.personality_code && profile?.mindset_level) {
    const { data, error } = await client
      .from("qsc_entrepreneur_extended_reports")
      .select(
        `
        personality_code,
        personality_label,
        mindset_label,
        mindset_level,
        profile_code,
        persona_label,
        personality_layer,
        mindset_layer,
        combined_quantum_pattern,
        how_to_communicate,
        how_they_make_decisions,
        core_business_problems,
        what_builds_trust,
        what_offer_ready_for,
        what_blocks_sale,
        pre_call_questions,
        micro_scripts,
        green_red_flags,
        real_life_example,
        final_summary
      `
      )
      .eq("personality_code", profile.personality_code)
      .eq("mindset_level", profile.mindset_level)
      .maybeSingle();

    if (error) {
      console.error(
        "[QSC extended] error loading entrepreneur_extended_reports by persona+mindset:",
        error
      );
    } else {
      extended = data;
    }
  }

  // 4) Respond with everything the Extended page needs
  return NextResponse.json({
    ok: true,
    results: result,
    profile,
    extended,
  });
}
