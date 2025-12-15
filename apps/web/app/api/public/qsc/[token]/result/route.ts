// apps/web/app/api/public/qsc/[token]/result/route.ts
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

      if (error || !takerRow?.link_token) {
        return { resolvedToken: null as string | null, takerRow: null as any };
      }
      return { resolvedToken: String(takerRow.link_token), takerRow };
    }

    // -----------------------------------------------------------------------
    // Resolve resultRow
    // -----------------------------------------------------------------------
    let resultRow: any = null;
    const resolution: any = { method: null as string | null };

    // A) direct: qsc_results.token === tokenParam
    {
      const r = await loadResultBy("token", tokenParam);
      if (r.error) {
        return NextResponse.json(
          {
            ok: false,
            error: `qsc_results load failed: ${r.error.message}`,
          },
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
          {
            ok: false,
            error: `qsc_results load failed: ${r.error.message}`,
          },
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
            {
              ok: false,
              error: `qsc_results load failed: ${r.error.message}`,
            },
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
            resolution.method =
              "test_takers.id=tid -> qsc_results.token=link_token";
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

    const audience: "entrepreneur" | "leader" | null =
      resultRow.audience ?? null;

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
    // Load QSC profile (snapshot/internal)
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
    // Load persona (Strategic report content)
    // - Entrepreneur uses portal.qsc_personas
    // - Leader uses portal.qsc_leader_personas (includes persona.sections JSON)
    // -----------------------------------------------------------------------
    let persona: any = null;
    const personaResolution: any = {
      table: null as string | null,
      method: null as string | null,
    };

    const personaTable =
      audience === "leader" ? "qsc_leader_personas" : "qsc_personas";

    personaResolution.table = personaTable;

    if (combinedProfileCode) {
      // 1) Prefer test-specific persona
      {
        const { data: personaRow, error: personaErr } = await sb
          .from(personaTable as any)
          .select("*")
          .eq("test_id", testId)
          .eq("profile_code", combinedProfileCode)
          .maybeSingle();

        if (!personaErr && personaRow) {
          persona = personaRow;
          personaResolution.method = "test_id+profile_code";
        }
      }

      // 2) Fallback to global persona (profile_code only)
      if (!persona) {
        const { data: globalPersona, error: globalErr } = await sb
          .from(personaTable as any)
          .select("*")
          .eq("profile_code", combinedProfileCode)
          .limit(1)
          .maybeSingle();

        if (!globalErr && globalPersona) {
          persona = globalPersona;
          personaResolution.method = "profile_code_global";
        }
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
        __persona_resolution: personaResolution,
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
