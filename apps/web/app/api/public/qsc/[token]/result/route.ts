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
 * GET /api/public/qsc/[token]/result?tid=...
 *
 * Tries multiple strategies:
 * 1) qsc_results.token = token
 * 2) if tid provided:
 *    - qsc_results.id = tid
 *    - qsc_results.token = tid
 *    - qsc_results.test_id = tid
 *    - if tid is a test_taker id: load test_takers.id = tid -> link_token -> qsc_results.token = link_token
 *
 * Returns:
 * - results → row from qsc_results
 * - profile → row from qsc_profiles
 * - persona → row from qsc_personas
 * - taker   → row from test_takers
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

    const url = new URL(req.url);
    const tid = (url.searchParams.get("tid") || "").trim();

    const sb = supa();

    // -----------------------------------------------------------------------
    // Helper: load result row by a provided where clause
    // -----------------------------------------------------------------------
    async function loadResultBy(where: { col: string; val: string }) {
      const { data, error } = await sb
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
        // @ts-ignore - dynamic column
        .eq(where.col, where.val)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { row: null as any, error };
      return { row: data, error: null as any };
    }

    // -----------------------------------------------------------------------
    // 1) Primary lookup: qsc_results.token === token
    // -----------------------------------------------------------------------
    let resultRow: any = null;
    {
      const { row, error } = await loadResultBy({ col: "token", val: token });
      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      resultRow = row;
    }

    // -----------------------------------------------------------------------
    // 1b) Fallbacks using tid (if provided)
    // -----------------------------------------------------------------------
    if (!resultRow && tid) {
      // Try: tid is qsc_results.id
      let attempt = await loadResultBy({ col: "id", val: tid });
      if (!attempt.error && attempt.row) resultRow = attempt.row;

      // Try: tid is actually the token
      if (!resultRow) {
        attempt = await loadResultBy({ col: "token", val: tid });
        if (!attempt.error && attempt.row) resultRow = attempt.row;
      }

      // Try: tid is test_id
      if (!resultRow) {
        attempt = await loadResultBy({ col: "test_id", val: tid });
        if (!attempt.error && attempt.row) resultRow = attempt.row;
      }

      // Try: tid is a test_taker id -> resolve its link_token -> use that as qsc_results.token
      if (!resultRow) {
        const { data: takerById, error: takerByIdErr } = await sb
          .from("test_takers")
          .select(`id, link_token`)
          .eq("id", tid)
          .maybeSingle();

        if (!takerByIdErr && takerById?.link_token) {
          const resolvedToken = String(takerById.link_token);
          const { row } = await loadResultBy({
            col: "token",
            val: resolvedToken,
          });
          if (row) resultRow = row;
        }
      }
    }

    if (!resultRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "No QSC result found for this token",
          debug: { token, tid: tid || null },
        },
        { status: 404 }
      );
    }

    const testId: string = resultRow.test_id;
    const qscProfileId: string | null = resultRow.qsc_profile_id ?? null;
    const combinedProfileCode: string | null =
      resultRow.combined_profile_code ?? null;

    // -----------------------------------------------------------------------
    // 2) Load test taker (try by link_token; if not found and tid exists, try id)
    // -----------------------------------------------------------------------
    let taker: any = null;

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
      .eq("link_token", resultRow.token) // IMPORTANT: use the resolved result token
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!takerErr && takerRow) {
      taker = takerRow;
    } else if (tid) {
      const { data: takerById, error: takerByIdErr } = await sb
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
        .eq("id", tid)
        .maybeSingle();

      if (!takerByIdErr && takerById) taker = takerById;
    }

    // -----------------------------------------------------------------------
    // 3) Load QSC profile (Extended Source Code / internal insights)
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
          created_at,
          full_internal_insights
        `
        )
        .eq("id", qscProfileId)
        .maybeSingle();

      if (!profErr && profRow) profile = profRow;
    }

    // -----------------------------------------------------------------------
    // 4) Load Persona (Strategic Growth / Leadership report content)
    // -----------------------------------------------------------------------
    let persona: any = null;

    if (combinedProfileCode) {
      // 4a) test-specific
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
        // 4b) global fallback
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

        if (!globalErr && globalPersona) persona = globalPersona;
      }
    }

    // -----------------------------------------------------------------------
    // 5) Return payload
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


