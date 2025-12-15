// apps/web/app/api/public/qsc/[token]/extended/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    s
  );
}

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const tokenParam = (params.token || "").trim();
  const url = new URL(req.url);
  const tid = (url.searchParams.get("tid") || "").trim();

  const client = supa();

  async function loadResultBy(col: string, val: string) {
    const { data, error } = await client
      .from("qsc_results")
      .select(
        `
        id,
        test_id,
        token,
        taker_id,
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
    const { data: takerRow, error } = await client
      .from("test_takers")
      .select("id, link_token")
      .eq("id", maybeId)
      .maybeSingle();

    if (error || !takerRow?.link_token) return null;
    return String(takerRow.link_token);
  }

  try {
    if (!tokenParam) {
      return NextResponse.json(
        { ok: false, error: "Missing token in URL" },
        { status: 400 }
      );
    }

    let result: any = null;

    // A) direct token
    {
      const r = await loadResultBy("token", tokenParam);
      if (r.error)
        return NextResponse.json(
          { ok: false, error: r.error.message },
          { status: 500 }
        );
      if (r.row) result = r.row;
    }

    // B) by id
    if (!result) {
      const r = await loadResultBy("id", tokenParam);
      if (r.error)
        return NextResponse.json(
          { ok: false, error: r.error.message },
          { status: 500 }
        );
      if (r.row) result = r.row;
    }

    // C) tokenParam is test_taker id
    if (!result && isUuidLike(tokenParam)) {
      const resolved = await resolveViaTestTakerId(tokenParam);
      if (resolved) {
        const r = await loadResultBy("token", resolved);
        if (r.error)
          return NextResponse.json(
            { ok: false, error: r.error.message },
            { status: 500 }
          );
        if (r.row) result = r.row;
      }
    }

    // D) tid fallbacks
    if (!result && tid) {
      let r = await loadResultBy("id", tid);
      if (r.row) result = r.row;

      if (!result) {
        r = await loadResultBy("token", tid);
        if (r.row) result = r.row;
      }

      if (!result) {
        r = await loadResultBy("test_id", tid);
        if (r.row) result = r.row;
      }

      if (!result && isUuidLike(tid)) {
        const resolved = await resolveViaTestTakerId(tid);
        if (resolved) {
          r = await loadResultBy("token", resolved);
          if (r.row) result = r.row;
        }
      }
    }

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Result not found" },
        { status: 404 }
      );
    }

    // 2) Load profile row
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

      if (!error && data) profile = data;
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

      if (!error && data) profile = data;
    }

    // 3) Load extended row: pick correct table by audience
    const audience = String(result.audience || "").toLowerCase();
    const extendedTable =
      audience === "leader"
        ? "qsc_leader_extended_reports"
        : "qsc_entrepreneur_extended_reports";

    let extended: any = null;

    if (profile?.profile_code) {
      const { data, error } = await client
        .from(extendedTable)
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

      if (!error && data) extended = data;
    }

    // Fallback by personality_code + mindset_level
    if (!extended && profile?.personality_code && profile?.mindset_level) {
      const { data, error } = await client
        .from(extendedTable)
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

      if (!error && data) extended = data;
    }

    return NextResponse.json({
      ok: true,
      results: result,
      profile,
      extended,
      __debug: { extendedTable },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
