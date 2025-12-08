import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

/**
 * QSC Result API
 *
 * GET /api/public/qsc/[token]/result
 *
 * Returns:
 * - results → row from qsc_results (scores, primary/secondary, combined profile)
 * - profile → row from qsc_profiles (Extended Source Code / internal insights)
 * - persona → row from qsc_personas (Strategic Report copy)
 * - taker   → row from test_takers (name/email/company/role)
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing token in URL" },
        { status: 400 }
      );
    }

    const sb = supa();

    // -----------------------------------------------------------------------
    // 1) Load the QSC results row for this token (latest if multiple)
    // -----------------------------------------------------------------------
    const { data: resultRow, error: resErr } = await sb
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
        audience,
        created_at
      `
      )
      .eq("token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resErr) {
      return NextResponse.json(
        { ok: false, error: `qsc_results load failed: ${resErr.message}` },
        { status: 500 }
      );
    }
    if (!resultRow) {
      return NextResponse.json(
        { ok: false, error: "No QSC result found for this token" },
        { status: 404 }
      );
    }

    const testId: string = resultRow.test_id;
    const qscProfileId: string | null = resultRow.qsc_profile_id ?? null;
    const combinedProfileCode: string | null =
      resultRow.combined_profile_code ?? null;

    // -----------------------------------------------------------------------
    // 2) Load the test taker (for name/email on reports)
    // -----------------------------------------------------------------------
    const { data: takerRow, error: takerErr } = await sb
      .from("test_takers")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        company,
        role_title
      `
      )
      .eq("link_token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // If there's an error here, it's not fatal for the report
    const taker = takerErr ? null : takerRow;

    // -----------------------------------------------------------------------
    // 3) Load the QSC profile (Extended Source Code / internal insights)
    // -----------------------------------------------------------------------
    let profile: any = null;
    if (qscProfileId) {
      const { data: profRow, error: profErr } = await sb
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
          created_at
        `
        )
        .eq("id", qscProfileId)
        .maybeSingle();

      if (!profErr && profRow) {
        profile = profRow;
      } else {
        profile = null;
      }
    }

    // -----------------------------------------------------------------------
    // 4) Load Persona (Strategic Report content)
    //
    // First try: persona for this specific test_id + profile_code.
    // Fallback: any persona with the same profile_code (global library),
    // so multiple QSC tests can share the same personas.
    // -----------------------------------------------------------------------
    let persona: any = null;

    if (combinedProfileCode) {
      // 4a) Try test-specific persona
      const { data: personaRow, error: personaErr } = await sb
        .from("qsc_personas")
        .select(
          `
          id,
          test_id,
          personality_code,
          mindset_level,
          profile_code,
          profile_label,
          show_up_summary,
          energisers,
          drains,
          communication_long,
          admired_for,
          stuck_points,
          one_page_strengths,
          one_page_risks,
          combined_strengths,
          combined_risks,
          combined_big_lever,
          emotional_stabilises,
          emotional_destabilises,
          emotional_patterns_to_watch,
          decision_style_long,
          support_yourself,
          strategic_priority_1,
          strategic_priority_2,
          strategic_priority_3
        `
        )
        .eq("test_id", testId)
        .eq("profile_code", combinedProfileCode)
        .maybeSingle();

      if (!personaErr && personaRow) {
        persona = personaRow;
      } else {
        // 4b) Fallback: global persona for this profile_code (any test_id)
        const { data: globalPersona, error: globalErr } = await sb
          .from("qsc_personas")
          .select(
            `
            id,
            test_id,
            personality_code,
            mindset_level,
            profile_code,
            profile_label,
            show_up_summary,
            energisers,
            drains,
            communication_long,
            admired_for,
            stuck_points,
            one_page_strengths,
            one_page_risks,
            combined_strengths,
            combined_risks,
            combined_big_lever,
            emotional_stabilises,
            emotional_destabilises,
            emotional_patterns_to_watch,
            decision_style_long,
            support_yourself,
            strategic_priority_1,
            strategic_priority_2,
            strategic_priority_3
          `
          )
          .eq("profile_code", combinedProfileCode)
          .limit(1)
          .maybeSingle();

        if (!globalErr && globalPersona) {
          persona = globalPersona;
        } else {
          persona = null;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 5) Return combined payload
    // -----------------------------------------------------------------------
    return NextResponse.json(
      {
        ok: true,
        results: resultRow,
        profile,
        persona,
        taker,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected error in QSC result endpoint",
      },
      { status: 500 }
    );
  }
}


