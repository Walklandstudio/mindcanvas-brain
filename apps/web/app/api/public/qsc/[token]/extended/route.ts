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
  test_id: string; // wrapper
  content_test_id?: string | null; // canonical
  token: string;
  taker_id: string | null;
  audience: Audience | null;
  combined_profile_code: string | null; // e.g. "B1"
  qsc_profile_id: string | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: PersonalityKey | string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
};

type EntrepreneurExtendedRow = {
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
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

function parseCombinedProfileCode(code: string | null | undefined): {
  personality_code: "A" | "B" | "C" | "D" | null;
  mindset_level: number | null;
} {
  const c = String(code || "").trim().toUpperCase();
  const m = c.match(/^([ABCD])\s*[-_ ]?\s*([1-5])$/);
  if (!m) return { personality_code: null, mindset_level: null };
  return { personality_code: m[1] as any, mindset_level: Number(m[2]) };
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const tokenParam = String(params.token || "").trim();
    if (!tokenParam) {
      return NextResponse.json({ ok: false, error: "Missing token in URL" }, { status: 400 });
    }

    const url = new URL(req.url);
    const tid = String(url.searchParams.get("tid") || "").trim();

    const sb = supa();

    // 1) Resolve qsc_results
    const resultSelect = `
      id,
      test_id,
      content_test_id,
      token,
      taker_id,
      audience,
      combined_profile_code,
      qsc_profile_id,
      created_at
    `;

    let result: QscResultsRow | null = null;

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
        return NextResponse.json({ ok: false, error: `qsc_results load failed: ${error.message}` }, { status: 500 });
      }
      if (data) result = data as any;
    }

    if (!result) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(resultSelect)
        .eq("token", tokenParam)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ ok: false, error: `qsc_results load failed: ${error.message}` }, { status: 500 });
      }
      if (data) result = data as any;
    }

    if (!result && isUuidLike(tokenParam)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(resultSelect)
        .eq("id", tokenParam)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ ok: false, error: `qsc_results load failed: ${error.message}` }, { status: 500 });
      }
      if (data) result = data as any;
    }

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "RESULT_NOT_FOUND", debug: { token: tokenParam, tid: tid || null } },
        { status: 404 }
      );
    }

    const wrapper_test_id = result.test_id;
    const content_test_id = (result as any).content_test_id ?? null;

    // 2) Load taker
    let taker: TestTakerRow | null = null;

    if (result.taker_id) {
      const { data } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", result.taker_id)
        .maybeSingle();
      if (data) taker = data as any;
    }

    if (!taker) {
      const { data } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title, link_token")
        .eq("link_token", result.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) taker = data as any;
    }

    // 3) Derive key from combined_profile_code (B1)
    let personalityABCD: "A" | "B" | "C" | "D" | null = null;
    let mindsetLevel: number | null = null;

    const parsed = parseCombinedProfileCode(result.combined_profile_code);
    if (parsed.personality_code && parsed.mindset_level) {
      personalityABCD = parsed.personality_code;
      mindsetLevel = parsed.mindset_level;
    }

    // Fallback: qsc_profiles snapshot
    let profile: QscProfileRow | null = null;

    if (!personalityABCD || !mindsetLevel) {
      if (result.qsc_profile_id) {
        const { data } = await sb
          .from("qsc_profiles")
          .select("id, personality_code, mindset_level, profile_code, profile_label")
          .eq("id", result.qsc_profile_id)
          .maybeSingle();
        if (data) profile = data as any;
      }

      if (profile?.mindset_level && profile?.personality_code) {
        mindsetLevel = Number(profile.mindset_level);
        personalityABCD = toABCD(profile.personality_code);
      }
    }

    if (!personalityABCD || !mindsetLevel) {
      return NextResponse.json(
        {
          ok: true,
          results: result,
          profile: profile ?? null,
          extended: null,
          taker,
          __debug: {
            reason: "KEY_NOT_RESOLVED",
            wrapper_test_id,
            content_test_id,
            combined_profile_code: result.combined_profile_code,
            parsed,
            profile,
          },
        },
        { status: 200 }
      );
    }

    // 4) Load Entrepreneur Extended row
    const { data: extRow, error: extErr } = await sb
      .from("qsc_entrepreneur_extended_reports")
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
      return NextResponse.json({ ok: false, error: `extended load failed: ${extErr.message}` }, { status: 500 });
    }

    const extended: EntrepreneurExtendedRow | null = extRow
      ? {
          persona_label: safeStr(extRow.persona_label),
          personality_label: safeStr(extRow.personality_label) ?? personalityLabelFromABCD(personalityABCD),
          mindset_label: safeStr(extRow.mindset_label) ?? mindsetLabel(mindsetLevel),
          profile_code: safeStr(extRow.profile_code) ?? result.combined_profile_code ?? profile?.profile_code ?? null,

          personality_layer: safeStr(extRow.personality_layer),
          mindset_layer: safeStr(extRow.mindset_layer),
          combined_quantum_pattern: safeStr(extRow.combined_quantum_pattern),

          how_to_communicate: safeStr(extRow.how_to_communicate),
          how_they_make_decisions: safeStr(extRow.how_they_make_decisions),
          core_business_problems: safeStr(extRow.core_business_problems),
          what_builds_trust: safeStr(extRow.what_builds_trust),
          what_offer_ready_for: safeStr(extRow.what_offer_ready_for),
          what_blocks_sale: safeStr(extRow.what_blocks_sale),

          pre_call_questions: safeStr(extRow.pre_call_questions),
          micro_scripts: safeStr(extRow.micro_scripts),
          green_red_flags: safeStr(extRow.green_red_flags),
          real_life_example: safeStr(extRow.real_life_example),
          final_summary: safeStr(extRow.final_summary),
        }
      : null;

    return NextResponse.json(
      {
        ok: true,
        results: result,
        profile: profile ?? null,
        extended,
        taker,
        __debug: {
          token: tokenParam,
          tid: tid || null,
          wrapper_test_id,
          content_test_id,
          personality_code_abcd: personalityABCD,
          mindset_level: mindsetLevel,
          extended_found: Boolean(extRow),
          resolved_by: tid && isUuidLike(tid) ? "token+taker_id" : "token_latest",
          key_source:
            parsed.personality_code && parsed.mindset_level ? "combined_profile_code" : "qsc_profiles_fallback",
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
