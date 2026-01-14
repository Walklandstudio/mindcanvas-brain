// apps/web/app/api/public/qsc/[token]/result/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Audience = "entrepreneur" | "leader";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  taker_id: string | null;
  audience: Audience | null;

  personality_totals: Record<string, number> | null;
  personality_percentages: Record<string, number> | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: Record<string, number> | null;

  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;

  combined_profile_code: string | null;
  qsc_profile_id: string | null;

  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null; // "A"|"B"|"C"|"D" OR "FIRE"|"FLOW"...
  mindset_level: number | null; // 1..5
  profile_code: string | null; // ideally A1..D5
  profile_label: string | null;

  how_to_communicate?: string | null;
  decision_style?: string | null;
  business_challenges?: string | null;
  trust_signals?: string | null;
  offer_fit?: string | null;
  sale_blockers?: string | null;

  full_internal_insights?: any;
  created_at?: string | null;
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

type TestMetaRow = {
  id: string;
  slug: string | null;
  meta: any | null;
};

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function looksLikePersonaCode(v: string | null | undefined) {
  if (!v) return false;
  return /^[ABCD][1-5]$/i.test(String(v).trim());
}

function personalityToLetter(
  p: string | null | undefined
): "A" | "B" | "C" | "D" | null {
  const x = String(p || "").trim().toUpperCase();
  if (x === "A" || x === "B" || x === "C" || x === "D") return x as any;
  if (x === "FIRE") return "A";
  if (x === "FLOW") return "B";
  if (x === "FORM") return "C";
  if (x === "FIELD") return "D";
  return null;
}

function mindsetKeyToLevel(m: string | null | undefined): number | null {
  const x = String(m || "").trim().toUpperCase();
  if (x === "ORIGIN") return 1;
  if (x === "MOMENTUM") return 2;
  if (x === "VECTOR") return 3;
  if (x === "ORBIT") return 4;
  if (x === "QUANTUM") return 5;
  return null;
}

function normalizeSlug(s: any) {
  return String(s || "").trim().toLowerCase();
}

/**
 * Resolve wrapper test_id -> canonical content test_id (global fix)
 * - Wrapper is identified by tests.meta.wrapper === true
 * - Uses meta.source_tests + meta.default_source_test
 * - Picks by slug:
 *    leader => qsc-leaders
 *    entrepreneur => qsc-core
 */
async function resolveContentTestId(
  sb: ReturnType<typeof supa>,
  wrapperTestId: string,
  audienceHint: Audience | null
): Promise<{ contentTestId: string; resolvedBy: string }> {
  const { data: testRow, error } = await sb
    .from("tests")
    .select("id, slug, meta")
    .eq("id", wrapperTestId)
    .maybeSingle();

  if (error || !testRow) {
    return { contentTestId: wrapperTestId, resolvedBy: "tests.lookup_failed" };
  }

  const meta = (testRow as any)?.meta ?? {};
  const isWrapper = meta?.wrapper === true;

  if (!isWrapper) {
    return { contentTestId: wrapperTestId, resolvedBy: "not_wrapper" };
  }

  const sourceTests: string[] = Array.isArray(meta?.source_tests)
    ? meta.source_tests
    : [];
  const defaultSource: string | null =
    typeof meta?.default_source_test === "string"
      ? meta.default_source_test
      : null;

  // Prefer choosing by slug (stable)
  const preferredSlug =
    audienceHint === "leader" ? "qsc-leaders" : "qsc-core";

  if (sourceTests.length) {
    const { data: candidates } = await sb
      .from("tests")
      .select("id, slug, meta")
      .in("id", sourceTests);

    const list = (candidates ?? []) as unknown as TestMetaRow[];

    const preferred = list.find(
      (t) => normalizeSlug(t.slug) === preferredSlug
    );
    if (preferred?.id) {
      return {
        contentTestId: preferred.id,
        resolvedBy: `meta.source_tests.slug=${preferredSlug}`,
      };
    }

    // If not found, but default_source_test is present, use it
    if (defaultSource && isUuidLike(defaultSource)) {
      return {
        contentTestId: defaultSource,
        resolvedBy: "meta.default_source_test",
      };
    }

    // Fallback to first source test
    const first = list.find((t) => isUuidLike(t.id));
    if (first?.id) {
      return {
        contentTestId: first.id,
        resolvedBy: "meta.source_tests[0]",
      };
    }
  }

  // If no sources, fallback to wrapper itself
  return { contentTestId: wrapperTestId, resolvedBy: "wrapper_no_sources" };
}

/**
 * Resolve persona code A1..D5 even when combined_profile_code is e.g. FLOW_VECTOR
 */
function resolvePersonaCode(args: {
  resultRow: QscResultsRow;
  profile: QscProfileRow | null;
}): { personaCode: string | null; source: string | null } {
  const { resultRow, profile } = args;

  const combinedRaw = String(resultRow.combined_profile_code || "").trim();

  // (1) already A1..D5
  if (looksLikePersonaCode(combinedRaw)) {
    return {
      personaCode: combinedRaw.toUpperCase(),
      source: "qsc_results.combined_profile_code",
    };
  }

  // (2) profile.profile_code is best if present
  const pcode = String(profile?.profile_code || "").trim();
  if (looksLikePersonaCode(pcode)) {
    return { personaCode: pcode.toUpperCase(), source: "qsc_profiles.profile_code" };
  }

  // (3) derive from personality + mindset_level
  const letter =
    personalityToLetter(profile?.personality_code) ||
    personalityToLetter(resultRow.primary_personality);

  const level =
    typeof profile?.mindset_level === "number" && Number.isFinite(profile.mindset_level)
      ? Number(profile.mindset_level)
      : mindsetKeyToLevel(resultRow.primary_mindset);

  if (letter && level && level >= 1 && level <= 5) {
    const derived = `${letter}${level}`;
    return { personaCode: derived, source: "derived(personality+mindset)" };
  }

  return { personaCode: null, source: null };
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
    const tid = String(url.searchParams.get("tid") || "").trim();

    const sb = supa();

    const baseSelect = `
      id,
      test_id,
      token,
      taker_id,
      audience,
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
    `;

    let resultRow: QscResultsRow | null = null;
    let resolvedBy: "token+taker_id" | "token_latest" | "result_id" | null = null;

    // (1) token + tid
    if (tid && isUuidLike(tid)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(baseSelect)
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
      if (data) {
        resultRow = data as unknown as QscResultsRow;
        resolvedBy = "token+taker_id";
      }
    }

    // (2) token latest
    if (!resultRow) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(baseSelect)
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
      if (data) {
        resultRow = data as unknown as QscResultsRow;
        resolvedBy = "token_latest";
      }
    }

    // (3) tokenParam might be qsc_results.id
    if (!resultRow && isUuidLike(tokenParam)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(baseSelect)
        .eq("id", tokenParam)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) {
        resultRow = data as unknown as QscResultsRow;
        resolvedBy = "result_id";
      }
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

    const wrapperTestId = String(resultRow.test_id);
    const audience = (resultRow.audience ?? null) as Audience | null;

    // ✅ Global: resolve canonical content test for persona lookups
    const { contentTestId, resolvedBy: contentResolvedBy } =
      await resolveContentTestId(sb, wrapperTestId, audience);

    // ---------------------------------------------------------------------
    // Load taker
    // ---------------------------------------------------------------------
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

    // ---------------------------------------------------------------------
    // Load QSC profile snapshot
    // ---------------------------------------------------------------------
    const qscProfileId = resultRow.qsc_profile_id ?? null;

    let profile: QscProfileRow | null = null;
    if (qscProfileId) {
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
          full_internal_insights,
          created_at
        `
        )
        .eq("id", qscProfileId)
        .maybeSingle();

      if (!error && data) profile = data as unknown as QscProfileRow;
    }

    // ---------------------------------------------------------------------
    // Resolve persona_code A1..D5
    // ---------------------------------------------------------------------
    const { personaCode, source: personaCodeSource } = resolvePersonaCode({
      resultRow,
      profile,
    });

    // ---------------------------------------------------------------------
    // Load persona content (from canonical contentTestId, NOT wrapper)
    // ---------------------------------------------------------------------
    let persona: any = null;
    const persona_debug: any = {
      table: null as string | null,
      method: null as string | null,
      persona_code: personaCode,
      persona_code_source: personaCodeSource,
      wrapper_test_id: wrapperTestId,
      content_test_id: contentTestId,
      content_resolved_by: contentResolvedBy,
    };

    if (personaCode) {
      if (audience === "leader") {
        persona_debug.table = "qsc_leader_personas";

        // 1) test-specific leader persona (canonical test id)
        {
          const { data, error } = await sb
            .from("qsc_leader_personas")
            .select("*")
            .eq("test_id", contentTestId)
            .eq("profile_code", personaCode)
            .maybeSingle();

          if (!error && data) {
            persona = data;
            persona_debug.method = "content_test_id+profile_code";
          }
        }

        // 2) global fallback: profile_code only
        if (!persona) {
          const { data, error } = await sb
            .from("qsc_leader_personas")
            .select("*")
            .eq("profile_code", personaCode)
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            persona = data;
            persona_debug.method = "profile_code_global";
          }
        }
      } else {
        persona_debug.table = "qsc_personas";

        // 1) prefer canonical test_id if that table has it (safe: try)
        {
          const { data, error } = await sb
            .from("qsc_personas")
            .select("*")
            .eq("test_id", contentTestId)
            .eq("profile_code", personaCode)
            .maybeSingle();

          if (!error && data) {
            persona = data;
            persona_debug.method = "content_test_id+profile_code";
          }
        }

        // 2) fallback: profile_code only
        if (!persona) {
          const { data, error } = await sb
            .from("qsc_personas")
            .select("*")
            .eq("profile_code", personaCode)
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            persona = data;
            persona_debug.method = "profile_code_global";
          }
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
        __debug: {
          token: tokenParam,
          tid: tid || null,
          resolved_by: resolvedBy,
          audience,
          combined_profile_code_raw: resultRow.combined_profile_code ?? null,
          persona_debug,
        },
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
