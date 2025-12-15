import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

// Small helper
function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    s
  );
}

/**
 * QSC Result API
 *
 * GET /api/public/qsc/[token]/result?tid=...
 *
 * Resolves results robustly because [token] can be:
 * - qsc_results.token (link token)
 * - qsc_results.id
 * - test_takers.id (UUID) -> test_takers.link_token -> qsc_results.token
 *
 * tid (optional) can be:
 * - qsc_results.id
 * - qsc_results.token
 * - qsc_results.test_id
 * - test_takers.id -> link_token -> qsc_results.token
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const tokenParam = (params.token || "").trim();
    if (!tokenParam) {
      return NextResponse.json(
        { ok: false, error: "Missing token in URL" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const tid = (url.searchParams.get("tid") || "").trim();

    const sb = supa();

    async function loadResultBy(col: string, val: string) {
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
        // @ts-ignore
        .eq(col, val)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { row: data ?? null, error: error ?? null };
    }

    async function resolveViaTestTakerId(maybeId: string) {
      const { data: takerRow, error } = await sb
        .from("test_takers")
        .select("id, link_token")
        .eq("id", maybeId)
        .maybeSingle();

      if (error || !takerRow?.link_token)
        return { resolvedToken: null as string | null, takerRow: null as any };
      return { resolvedToken: String(takerRow.link_token), takerRow };
    }

    // -----------------------------------------------------------------------
    // Resolve resultRow
    // -----------------------------------------------------------------------
    let resultRow: any = null;
    let resolution: any = { method: null as string | null };

    // A) direct: qsc_results.token === tokenParam
    {
      const r = await loadResultBy("token", tokenParam);
      if (r.error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${r.error.message}` },
          { status: 500 }
        );
      }
      if (r.row) {
        resultRow = r.row;
        resolution.method = "qsc_results.token=tokenParam";
      }
    }

    // B) tokenParam might be qsc_results.id
    if (!resultRow) {
      const r = await loadResultBy("id", tokenParam);
      if (r.error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${r.error.message}` },
          { status: 500 }
        );
      }
      if (r.row) {
        resultRow = r.row;
        resolution.method = "qsc_results.id=tokenParam";
      }
    }

    // C) tokenParam might be test_takers.id -> link_token -> qsc_results.token
    if (!resultRow && isUuidLike(tokenParam)) {
      const { resolvedToken } = await resolveViaTestTakerId(tokenParam);
      if (resolvedToken) {
        const r = await loadResultBy("token", resolvedToken);
        if (r.error) {
          return NextResponse.json(
            { ok: false, error: `qsc_results load failed: ${r.error.message}` },
            { status: 500 }
          );
        }
        if (r.row) {
          resultRow = r.row;
          resolution.method =
            "test_takers.id=tokenParam -> qsc_results.token=link_token";
          resolution.resolvedToken = resolvedToken;
        }
      }
    }

    // D) If still not found, use tid fallbacks (ONLY if provided)
    if (!resultRow && tid) {
      // D1) tid is qsc_results.id
      let r = await loadResultBy("id", tid);
      if (r.row) {
        resultRow = r.row;
        resolution.method = "qsc_results.id=tid";
      }

      // D2) tid is qsc_results.token
      if (!resultRow) {
        r = await loadResultBy("token", tid);
        if (r.row) {
          resultRow = r.row;
          resolution.method = "qsc_results.token=tid";
        }
      }

      // D3) tid is qsc_results.test_id
      if (!resultRow) {
        r = await loadResultBy("test_id", tid);
        if (r.row) {
          resultRow = r.row;
          resolution.method = "qsc_results.test_id=tid";
        }
      }

      // D4) tid is test_takers.id -> link_token -> qsc_results.token
      if (!resultRow && isUuidLike(tid)) {
        const { resolvedToken } = await resolveViaTestTakerId(tid);
        if (resolvedToken) {
          r = await loadResultBy("token", resolvedToken);
          if (r.row) {
            resultRow = r.row;
            resolution.method = "test_takers.id=tid -> qsc_results.token=link_token";
            resolution.resolvedToken = resolvedToken;
          }
        }
      }
    }

    if (!resultRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "No QSC result found for this token",
          debug: { token: tokenParam, tid: tid || null },
        },
        { status: 404 }
      );
    }

    const testId: string = resultRow.test_id;
    const qscProfileId: string | null = resultRow.qsc_profile_id ?? null;
    const combinedProfileCode: string | null =
      resultRow.combined_profile_code ?? null;

    const audience: "entrepreneur" | "leader" | null = resultRow.audience ?? null;

    // -----------------------------------------------------------------------
    // Load test taker (prefer link_token match; else try tokenParam/tid as id)
    // -----------------------------------------------------------------------
    let taker: any = null;

    const { data: takerRow, error: takerErr } = await sb
      .from("test_takers")
      .select(`id, first_name, last_name, email, company, role_title`)
      .eq("link_token", resultRow.token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!takerErr && takerRow) taker = takerRow;

    if (!taker && isUuidLike(tokenParam)) {
      const { data, error } = await sb
        .from("test_takers")
        .select(`id, first_name, last_name, email, company, role_title`)
        .eq("id", tokenParam)
        .maybeSingle();
      if (!error && data) taker = data;
    }

    if (!taker && tid && isUuidLike(tid)) {
      const { data, error } = await sb
        .from("test_takers")
        .select(`id, first_name, last_name, email, company, role_title`)
        .eq("id", tid)
        .maybeSingle();
      if (!error && data) taker = data;
    }

    // -----------------------------------------------------------------------
    // Load QSC profile (snapshot fields)
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
    // Load persona (strategic report content)
    // - Entrepreneur uses portal.qsc_personas
    // - Leader uses portal.qsc_leader_personas
    // Prefer test-specific; fallback to global
    // -----------------------------------------------------------------------
    let persona: any = null;

    const personaTable =
      audience === "leader" ? "qsc_leader_personas" : "qsc_personas";

    if (combinedProfileCode) {
      // 1) Prefer test-specific (test_id = testId)
      const { data: personaRow, error: personaErr } = await sb
        // @ts-ignore
        .from(personaTable)
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
        // 2) Global fallback
        // - For leader: prefer rows where test_id IS NULL
        // - For entrepreneur: keep existing behavior (any row with profile_code)
        const q = sb
          // @ts-ignore
          .from(personaTable)
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
          .limit(1);

        const { data: globalPersona, error: globalErr } =
          audience === "leader"
            ? await q.is("test_id", null).maybeSingle()
            : await q.maybeSingle();

        if (!globalErr && globalPersona) persona = globalPersona;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        results: resultRow,
        profile,
        persona,
        taker,
        __resolution: resolution,
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
