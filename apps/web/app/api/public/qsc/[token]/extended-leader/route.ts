// apps/web/app/api/public/qsc/[token]/extended-leader/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Audience = "entrepreneur" | "leader";
type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  taker_id: string | null;
  audience: Audience | null;
  combined_profile_code: string | null; // may be FLOW_VECTOR
  qsc_profile_id: string | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: PersonalityKey | string | null; // FIRE/FLOW/FORM/FIELD or A-D
  mindset_level: number | null; // 1..5
  profile_code: string | null; // A1..D5
  profile_label: string | null;

  // snapshot fallback fields
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

type LeaderExtendedRow = {
  persona_label: string | null;
  personality_label: string | null;
  mindset_label: string | null;
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

function looksLikePersonaCode(v: string | null | undefined) {
  if (!v) return false;
  return /^[ABCD][1-5]$/i.test(v.trim());
}

function toABCD(code: string | null | undefined): "A" | "B" | "C" | "D" | null {
  const c = String(code || "").toUpperCase().trim();
  if (c === "A" || c === "B" || c === "C" || c === "D") return c;
  if (c === "FIRE") return "A";
  if (c === "FLOW") return "B";
  if (c === "FORM") return "C";
  if (c === "FIELD") return "D";
  return null;
}

function personalityLabelFromABCD(abcd: "A" | "B" | "C" | "D" | null) {
  if (!abcd) return null;
  if (abcd === "A") return "Fire";
  if (abcd === "B") return "Flow";
  if (abcd === "C") return "Form";
  if (abcd === "D") return "Field";
  return null;
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

function combinedToPersonaCode(combined: string | null | undefined): string | null {
  const raw = String(combined || "").trim().toUpperCase();
  if (!raw) return null;

  // already A1..D5
  if (looksLikePersonaCode(raw)) return raw;

  // expected PERSONALITY_MINDSET e.g. FLOW_VECTOR
  const parts = raw.split("_").filter(Boolean);
  if (parts.length < 2) return null;

  const personality = parts[0];
  const mindset = parts[1];

  const letter =
    personality === "FIRE" ? "A"
    : personality === "FLOW" ? "B"
    : personality === "FORM" ? "C"
    : personality === "FIELD" ? "D"
    : null;

  const lvl =
    mindset === "ORIGIN" ? 1
    : mindset === "MOMENTUM" ? 2
    : mindset === "VECTOR" ? 3
    : mindset === "ORBIT" ? 4
    : mindset === "QUANTUM" ? 5
    : null;

  if (!letter || !lvl) return null;
  return `${letter}${lvl}`;
}

function buildExtendedMerged(args: {
  extRow: any | null;
  profile: QscProfileRow;
  personalityABCD: "A" | "B" | "C" | "D";
  mindsetLevel: number;
  combinedProfileCode: string | null;
}): { extended: LeaderExtendedRow; source: { tableUsed: boolean; snapshotUsed: boolean } } {
  const { extRow, profile, personalityABCD, mindsetLevel, combinedProfileCode } = args;

  const insights = profile.full_internal_insights ?? null;

  const pick = (tableVal: any, snapshotVal: any) =>
    safeStr(tableVal) ?? safeStr(snapshotVal) ?? null;

  const personaLabel =
    safeStr(extRow?.persona_label) ??
    safeStr(profile.profile_label) ??
    safeStr(combinedProfileCode) ??
    "Quantum Profile";

  const extended: LeaderExtendedRow = {
    persona_label: personaLabel,
    personality_label:
      safeStr(extRow?.personality_label) ??
      personalityLabelFromABCD(personalityABCD),
    mindset_label: safeStr(extRow?.mindset_label) ?? mindsetLabel(mindsetLevel),
    profile_code:
      safeStr(extRow?.profile_code) ??
      safeStr(profile.profile_code) ??
      safeStr(combinedProfileCode),

    personality_layer: pick(extRow?.personality_layer, insights?.personality_layer),
    mindset_layer: pick(extRow?.mindset_layer, insights?.mindset_layer),
    combined_quantum_pattern: pick(
      extRow?.combined_quantum_pattern,
      insights?.combined_quantum_pattern
    ),

    how_to_communicate: pick(extRow?.how_to_communicate, profile.how_to_communicate),
    how_they_make_decisions: pick(extRow?.how_they_make_decisions, profile.decision_style),
    core_business_problems: pick(extRow?.core_business_problems, profile.business_challenges),
    what_builds_trust: pick(extRow?.what_builds_trust, profile.trust_signals),
    what_offer_ready_for: pick(extRow?.what_offer_ready_for, profile.offer_fit),
    what_blocks_sale: pick(extRow?.what_blocks_sale, profile.sale_blockers),

    pre_call_questions: pick(extRow?.pre_call_questions, insights?.pre_call_questions),
    micro_scripts: pick(extRow?.micro_scripts, insights?.micro_scripts),
    green_red_flags: pick(extRow?.green_red_flags, insights?.green_red_flags),
    real_life_example: pick(extRow?.real_life_example, insights?.real_life_example),
    final_summary: pick(extRow?.final_summary, insights?.final_summary),
  };

  const tableUsed = Boolean(extRow);
  const snapshotUsed =
    !tableUsed ||
    [
      extended.personality_layer,
      extended.mindset_layer,
      extended.combined_quantum_pattern,
      extended.how_to_communicate,
      extended.how_they_make_decisions,
      extended.core_business_problems,
      extended.what_builds_trust,
      extended.what_offer_ready_for,
      extended.what_blocks_sale,
      extended.pre_call_questions,
      extended.micro_scripts,
      extended.green_red_flags,
      extended.real_life_example,
      extended.final_summary,
    ].some((v) => v === null);

  return { extended, source: { tableUsed, snapshotUsed } };
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
    const tid = String(url.searchParams.get("tid") || "").trim(); // test_takers.id (UUID)

    const sb = supa();

    // ---------------------------
    // 1) Resolve qsc_results row
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

    let resultRow: QscResultsRow | null = null;

    // token + tid
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
      if (data) resultRow = data as unknown as QscResultsRow;
    }

    // token latest
    if (!resultRow) {
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
      if (data) resultRow = data as unknown as QscResultsRow;
    }

    // tokenParam might be qsc_results.id
    if (!resultRow && isUuidLike(tokenParam)) {
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
      if (data) resultRow = data as unknown as QscResultsRow;
    }

    if (!resultRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "RESULT_NOT_FOUND",
          debug: { token: tokenParam, tid: tid || null },
        },
        { status: 404 }
      );
    }

    // guard: leader only
    if (resultRow.audience && resultRow.audience !== "leader") {
      return NextResponse.json(
        {
          ok: false,
          error: "WRONG_AUDIENCE",
          debug: { expected: "leader", got: resultRow.audience },
        },
        { status: 400 }
      );
    }

    // ---------------------------
    // 2) Load taker
    // ---------------------------
    let taker: TestTakerRow | null = null;

    if (resultRow.taker_id) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", resultRow.taker_id)
        .maybeSingle();

      if (!error && data) taker = data as unknown as TestTakerRow;
    }

    if (!taker) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title, link_token")
        .eq("link_token", resultRow.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) taker = data as unknown as TestTakerRow;
    }

    // ---------------------------
    // 3) Load qsc_profiles snapshot (WITH fallback columns)
    // ---------------------------
    let profile: QscProfileRow | null = null;

    const profileSelect = `
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
    `;

    // primary: by qsc_profile_id (best)
    if (resultRow.qsc_profile_id) {
      const { data, error } = await sb
        .from("qsc_profiles")
        .select(profileSelect)
        .eq("id", resultRow.qsc_profile_id)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_profiles load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) profile = data as unknown as QscProfileRow;
    }

    // fallback: by profile_code
    // IMPORTANT: combined_profile_code may be FLOW_VECTOR so map it -> B3 first
    if (!profile) {
      const personaCode = combinedToPersonaCode(resultRow.combined_profile_code);
      const profileCodeToTry =
        (personaCode && looksLikePersonaCode(personaCode) ? personaCode : null) ||
        (looksLikePersonaCode(resultRow.combined_profile_code || "")
          ? String(resultRow.combined_profile_code).trim().toUpperCase()
          : null);

      if (profileCodeToTry) {
        const { data } = await sb
          .from("qsc_profiles")
          .select(profileSelect)
          .eq("profile_code", profileCodeToTry)
          .limit(1)
          .maybeSingle();

        if (data) profile = data as unknown as QscProfileRow;
      }
    }

    if (!profile?.mindset_level || !profile?.personality_code) {
      return NextResponse.json(
        {
          ok: false,
          error: "PROFILE_NOT_RESOLVED",
          debug: {
            result_id: resultRow.id,
            qsc_profile_id: resultRow.qsc_profile_id,
            combined_profile_code: resultRow.combined_profile_code,
            profile: profile ?? null,
          },
        },
        { status: 404 }
      );
    }

    const mindsetLevel = Number(profile.mindset_level);
    const personalityABCD = toABCD(profile.personality_code);

    if (!personalityABCD) {
      return NextResponse.json(
        {
          ok: false,
          error: "PERSONALITY_MAPPING_FAILED",
          debug: { personality_code: profile.personality_code },
        },
        { status: 500 }
      );
    }

    // ---------------------------
    // 4) Load leader extended row
    // ---------------------------
    const { data: extRow, error: extErr } = await sb
      .from("qsc_leader_extended_reports")
      .select(
        `
        persona_label,
        personality_label,
        mindset_label,
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

    if (extErr) {
      return NextResponse.json(
        { ok: false, error: `leader extended load failed: ${extErr.message}` },
        { status: 500 }
      );
    }

    const { extended, source } = buildExtendedMerged({
      extRow: extRow ?? null,
      profile,
      personalityABCD,
      mindsetLevel,
      combinedProfileCode: resultRow.combined_profile_code ?? null,
    });

    return NextResponse.json(
      {
        ok: true,
        results: resultRow,
        profile,
        extended,
        taker,
        __debug: {
          token: tokenParam,
          tid: tid || null,
          combined_profile_code_raw: resultRow.combined_profile_code,
          combined_profile_code_mapped: combinedToPersonaCode(resultRow.combined_profile_code),
          personality_code_raw: profile.personality_code,
          personality_code_abcd: personalityABCD,
          mindset_level: mindsetLevel,
          extended_found: Boolean(extRow),
          merge_source: source,
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
