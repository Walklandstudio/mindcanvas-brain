// apps/web/app/api/public/qsc/[token]/extended-leader/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Audience = "entrepreneur" | "leader";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  taker_id: string | null;
  audience: Audience | null;
  qsc_profile_id: string | null;
  combined_profile_code: string | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null; // might be FIRE/FLOW/FORM/FIELD or A/B/C/D depending on seed
  mindset_level: number | null; // 1..5
  profile_code: string | null;
  profile_label: string | null;
};

type QscLeaderExtendedRow = {
  persona_label: string | null;
  personality_label: string | null;
  mindset_label: string | null;
  mindset_level: number | null;
  personality_code: string | null; // A/B/C/D
  profile_code: string | null;

  personality_layer: string | null;
  mindset_layer: string | null;
  combined_quantum_pattern: string | null;

  how_to_communicate: string | null;
  how_they_make_decisions: string | null;
  core_business_problems: string | null;
  what_builds_trust: string | null;
  what_offer_ready_for: string | null;
  what_blocks_sale: string | null;

  pre_call_questions: string | null;
  micro_scripts: string | null;
  green_red_flags: string | null;
  real_life_example: string | null;
  final_summary: string | null;
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

function safeStr(v: any): string | null {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t.length ? t : null;
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

/**
 * Leader extended tables are keyed on personality_code A/B/C/D.
 * Your results may come through as FIRE/FLOW/FORM/FIELD, or already A/B/C/D.
 * This maps to the expected A-D.
 *
 * ✅ Adjust this mapping if your business rules differ.
 */
function toABCD(code: string | null | undefined): "A" | "B" | "C" | "D" | null {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;

  if (c === "A" || c === "B" || c === "C" || c === "D") return c;

  // Default mapping used in your QSC system seeding (common convention):
  if (c === "FIRE") return "A";
  if (c === "FLOW") return "B";
  if (c === "FORM") return "C";
  if (c === "FIELD") return "D";

  return null;
}

function personalityLabelFromABCD(code: string | null | undefined) {
  const c = String(code || "").toUpperCase();
  if (c === "A") return "Fire";
  if (c === "B") return "Flow";
  if (c === "C") return "Form";
  if (c === "D") return "Field";
  return c || null;
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
    const tid = String(url.searchParams.get("tid") || "").trim(); // test_takers.id uuid (preferred)

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
      qsc_profile_id,
      combined_profile_code,
      created_at
    `;

    let result: QscResultsRow | null = null;

    // Most precise: token + taker_id
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

    // Optional guard: if result is not leader, we still allow it,
    // but we tell you clearly (useful while you’re testing).
    const audienceMismatch =
      result.audience && result.audience !== "leader" ? result.audience : null;

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
        .select(
          "id, first_name, last_name, email, company, role_title, link_token"
        )
        .eq("link_token", result.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) taker = data as unknown as TestTakerRow;
    }

    // ---------------------------
    // 3) Load QSC profile (to get personality + mindset_level)
    // ---------------------------
    let profile: QscProfileRow | null = null;

    if (result.qsc_profile_id) {
      const { data, error } = await sb
        .from("qsc_profiles")
        .select("id, personality_code, mindset_level, profile_code, profile_label")
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

    // Fallback: if profile_id missing, try profile_code
    if (!profile && result.combined_profile_code) {
      const { data } = await sb
        .from("qsc_profiles")
        .select("id, personality_code, mindset_level, profile_code, profile_label")
        .eq("profile_code", result.combined_profile_code)
        .limit(1)
        .maybeSingle();

      if (data) profile = data as unknown as QscProfileRow;
    }

    const personalityABCD = toABCD(profile?.personality_code ?? null);
    const mindsetLevel = profile?.mindset_level ?? null;

    // ---------------------------
    // 4) Load Leader Extended by (A-D, 1-5)
    // ---------------------------
    let extended: QscLeaderExtendedRow | null = null;

    if (personalityABCD && mindsetLevel && Number.isFinite(mindsetLevel)) {
      const { data, error } = await sb
        .from("qsc_leader_extended_reports")
        .select(
          `
          persona_label,
          personality_label,
          mindset_label,
          mindset_level,
          personality_code,
          profile_code,
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
        .eq("personality_code", personalityABCD)
        .eq("mindset_level", mindsetLevel)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error: `qsc_leader_extended_reports load failed: ${error.message}`,
          },
          { status: 500 }
        );
      }

      if (data) extended = data as unknown as QscLeaderExtendedRow;
    }

    // If not found, return ok=true with extended=null so UI can show fallbacks,
    // but also include debug so you know it’s a SEED/KEY issue (not UI).
    const derivedPersonalityLabel =
      extended?.personality_label ||
      personalityLabelFromABCD(personalityABCD) ||
      null;

    const derivedMindsetLabel =
      extended?.mindset_label || mindsetLabel(mindsetLevel ?? null) || null;

    // Provide a *minimal* extended shell even if row missing,
    // so headers still show something meaningful.
    if (!extended) {
      extended = {
        persona_label:
          safeStr(profile?.profile_label) ||
          safeStr(profile?.profile_code) ||
          safeStr(result.combined_profile_code) ||
          "Leader Quantum Profile",
        personality_label: derivedPersonalityLabel,
        mindset_label: derivedMindsetLabel,
        mindset_level: mindsetLevel,
        personality_code: personalityABCD,
        profile_code: profile?.profile_code ?? result.combined_profile_code ?? null,

        personality_layer: null,
        mindset_layer: null,
        combined_quantum_pattern: null,

        how_to_communicate: null,
        how_they_make_decisions: null,
        core_business_problems: null,
        what_builds_trust: null,
        what_offer_ready_for: null,
        what_blocks_sale: null,

        pre_call_questions: null,
        micro_scripts: null,
        green_red_flags: null,
        real_life_example: null,
        final_summary: null,
      };
    }

    return NextResponse.json(
      {
        ok: true,
        results: result,
        profile,
        extended,
        taker,
        __debug: {
          route: "extended-leader",
          tid: tid || null,
          resolved_by: tid && isUuidLike(tid) ? "token+taker_id" : "token_latest",
          audience_mismatch: audienceMismatch, // null when ok
          derived_keys: {
            personality_code: personalityABCD,
            mindset_level: mindsetLevel,
          },
          extended_row_found: !!(extended && extended.personality_layer !== null) || null,
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
