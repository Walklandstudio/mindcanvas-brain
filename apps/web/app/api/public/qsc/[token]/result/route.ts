// apps/web/app/api/public/qsc/[token]/result/route.ts
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
    // 1) Load the latest QSC result for this token
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
    const combinedProfileCode: string | null =
      resultRow.combined_profile_code ?? null;
    const qscProfileId: string | null = resultRow.qsc_profile_id ?? null;

    // -----------------------------------------------------------------------
    // 2) Load QSC profile (internal profile definition)
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

      if (!profErr && profRow) profile = profRow;
    } else if (combinedProfileCode) {
      // Fallback: resolve by combined profile code
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
        .eq("profile_code", combinedProfileCode)
        .maybeSingle();

      if (!profErr && profRow) profile = profRow;
    }

    // -----------------------------------------------------------------------
    // 3) Load persona narrative (this feeds the Strategic Growth Report)
    //
    // We key by test_id + profile_code (e.g. FIRE_QUANTUM) so each test
    // can have its own wording per combined profile.
    // -----------------------------------------------------------------------
    let persona: any = null;

    if (combinedProfileCode) {
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
      }
    }

    // -----------------------------------------------------------------------
    // 4) Load test taker (for name / email on the report)
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

    const taker = takerErr ? null : takerRow;

    // -----------------------------------------------------------------------
    // 5) Respond
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

