// apps/web/app/api/public/qsc/[token]/extended/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Audience = "entrepreneur" | "leader";
type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  taker_id: string | null;
  audience: Audience | null;
  combined_profile_code: string | null;
  qsc_profile_id: string | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: PersonalityKey | string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;

  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;

  full_internal_insights: any | null;
};

type TestTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
  link_token?: string | null;
};

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function personalityLabel(code: string | null | undefined) {
  const c = String(code || "").toUpperCase();
  if (c === "FIRE") return "Fire";
  if (c === "FLOW") return "Flow";
  if (c === "FORM") return "Form";
  if (c === "FIELD") return "Field";
  return c || null;
}

function mindsetLabel(level: number | null | undefined) {
  if (!level || !Number.isFinite(level)) return null;
  const n = Number(level);
  if (n === 1) return "Origin";
  if (n === 2) return "Momentum";
  if (n === 3) return "Vector";
  if (n === 4) return "Orbit";
  if (n === 5) return "Quantum";
  return `Level ${n}`;
}

function safeStr(v: any): string | null {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t.length ? t : null;
}

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const tokenParam = String(params.token || "").trim();
    if (!tokenParam) {
      return NextResponse.json(
        { ok: false, error: "Missing token in URL" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const tid = String(url.searchParams.get("tid") || "").trim(); // expected: test_takers.id uuid

    const sb = supa();

    // ---------------------------
    // 1) Resolve result STRICTLY
    // ---------------------------
    const resultSelect = `
      id,
      test_id,
      token,
      taker_id,
      audience,
      combined_profile_code,
      qsc_profile_id,
      created_at
    `;

    let result: QscResultsRow | null = null;

    // Most precise: token + taker_id (when tid provided as UUID)
    if (tid && isUuidLike(tid)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(resultSelect)
        .eq("token", tokenParam)
        .eq("taker_id", tid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) result = data as unknown as QscResultsRow;
    }

    // Fallback: latest by token
    if (!result) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(resultSelect)
        .eq("token", tokenParam)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) result = data as unknown as QscResultsRow;
    }

    // If tokenParam is actually qsc_results.id
    if (!result && isUuidLike(tokenParam)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(resultSelect)
        .eq("id", tokenParam)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) result = data as unknown as QscResultsRow;
    }

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: "RESULT_NOT_FOUND",
          debug: { token: tokenParam, tid: tid || null },
        },
        { status: 404 }
      );
    }

    // ---------------------------
    // 2) Load taker
    // ---------------------------
    let taker: TestTakerRow | null = null;

    if (result.taker_id) {
      const { data } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", result.taker_id)
        .maybeSingle();

      if (data) taker = data as unknown as TestTakerRow;
    }

    // Fallback: link_token match
    if (!taker) {
      const { data } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title, link_token")
        .eq("link_token", result.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) taker = data as unknown as TestTakerRow;
    }

    // ---------------------------
    // 3) Load profile (snapshot)
    // ---------------------------
    let profile: QscProfileRow | null = null;

    if (result.qsc_profile_id) {
      const { data, error } = await sb
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
        return NextResponse.json(
          { ok: false, error: `qsc_profiles load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) profile = data as unknown as QscProfileRow;
    }

    // Optional fallback: profile_code match (only if you really have it seeded)
    if (!profile && result.combined_profile_code) {
      const { data } = await sb
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
        .limit(1)
        .maybeSingle();

      if (data) profile = data as unknown as QscProfileRow;
    }

    // ---------------------------
    // 4) Build Extended payload
    //    (NO mystery tables)
    // ---------------------------
    const personaLabel =
      profile?.profile_label ||
      result.combined_profile_code ||
      "Quantum Profile";

    const pLabel = personalityLabel(profile?.personality_code ?? null);
    const mLabel = mindsetLabel(profile?.mindset_level ?? null);

    const insights = profile?.full_internal_insights ?? null;

    const extended = {
      persona_label: personaLabel,
      personality_label: pLabel,
      mindset_label: mLabel,
      profile_code: profile?.profile_code ?? result.combined_profile_code ?? null,

      // These 3 are the ones you explicitly said were missing:
      personality_layer: safeStr(insights?.personality_layer) ?? null,
      mindset_layer: safeStr(insights?.mindset_layer) ?? null,
      combined_quantum_pattern:
        safeStr(insights?.combined_quantum_pattern) ?? null,

      // These map directly from qsc_profiles snapshot fields:
      how_to_communicate: profile?.how_to_communicate ?? null,
      how_they_make_decisions: profile?.decision_style ?? null,
      core_business_problems: profile?.business_challenges ?? null,
      what_builds_trust: profile?.trust_signals ?? null,
      what_offer_ready_for: profile?.offer_fit ?? null,
      what_blocks_sale: profile?.sale_blockers ?? null,

      // If you don’t have these yet, return null (page already has fallbacks)
      pre_call_questions: safeStr(insights?.pre_call_questions) ?? null,
      micro_scripts: safeStr(insights?.micro_scripts) ?? null,
      green_red_flags: safeStr(insights?.green_red_flags) ?? null,
      real_life_example: safeStr(insights?.real_life_example) ?? null,
      final_summary: safeStr(insights?.final_summary) ?? null,
    };

    return NextResponse.json(
      {
        ok: true,
        results: result,
        profile,
        extended,
        taker,
        __debug: {
          resolved_by: tid && isUuidLike(tid) ? "token+taker_id" : "token_latest",
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

