// apps/web/app/api/public/qsc/[token]/report/route.ts
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
 * QSC Report API
 *
 * GET /api/public/qsc/[token]/report
 *
 * Returns:
 * - results  → row from qsc_results (scores, primary/secondary, combined profile)
 * - profile  → row from qsc_profiles (persona details)
 * - sections → array of report_sections for this test (global sections such as intro, how_to_use, etc.)
 *
 * In the future, we can:
 * - filter persona-specific sections (persona_code) once we add them
 * - add org-specific overrides (org_id)
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

    // -----------------------------------------------------------------------
    // 2) Load the QSC profile (persona) for this result, if any
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

      if (profErr) {
        // not fatal for the whole report, but we include error message
        profile = null;
      } else {
        profile = profRow;
      }
    }

    // -----------------------------------------------------------------------
    // 3) Load report sections for this test (global sections)
    //
    //    For now:
    //    - org_id is null (base template)
    //    - persona_code is null (generic sections like intro/how_to_use/etc.)
    //    - later we can add persona-specific + org-specific overrides
    // -----------------------------------------------------------------------
    const { data: sectionRows, error: secErr } = await sb
      .from("report_sections")
      .select(
        `
        id,
        section_key,
        title,
        content,
        persona_code,
        order_index,
        is_active
      `
      )
      .eq("test_id", testId)
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (secErr) {
      return NextResponse.json(
        { ok: false, error: `report_sections load failed: ${secErr.message}` },
        { status: 500 }
      );
    }

    // In the future, when we store persona-specific sections, we can filter
    // for persona_code === profile.profile_code here and/or merge them
    // on the frontend.

    return NextResponse.json(
      {
        ok: true,
        results: resultRow,
        profile,
        sections: sectionRows ?? [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected error in QSC report endpoint",
      },
      { status: 500 }
    );
  }
}
