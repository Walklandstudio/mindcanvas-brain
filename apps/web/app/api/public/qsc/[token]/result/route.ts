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

  combined_profile_code: string | null; // e.g. FLOW_ORBIT or A1..D5
  qsc_profile_id: string | null;

  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null; // "A"|"B"|"C"|"D" OR "FIRE"|"FLOW"...
  mindset_level: number | null; // 1..5
  profile_code: string | null; // e.g. B4 OR FLOW_ORBIT (varies by dataset)
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
 * Wrapper identified by tests.meta.wrapper === true
 * Uses:
 *  - meta.source_tests (if present)
 *  - meta.default_source_test (your case)
 * Picks by slug when source_tests exist, otherwise uses default_source_test.
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

  // ✅ Your wrappers often ONLY have default_source_test — handle that first.
  if (defaultSource && isUuidLike(defaultSource)) {
    return { contentTestId: defaultSource, resolvedBy: "meta.default_source_test" };
  }

  const preferredSlug = audienceHint === "leader" ? "qsc-leaders" : "qsc-core";

  if (sourceTests.length) {
    const { data: candidates } = await sb
      .from("tests")
      .select("id, slug, meta")
      .in("id", sourceTests);

    const list = (candidates ?? []) as unknown as TestMetaRow[];
    const preferred = list.find((t) => normalizeSlug(t.slug) === preferredSlug);

    if (preferred?.id) {
      return {
        contentTestId: preferred.id,
        resolvedBy: `meta.source_tests.slug=${preferredSlug}`,
      };
    }

    const first = list.find((t) => isUuidLike(t.id));
    if (first?.id) {
      return { contentTestId: first.id, resolvedBy: "meta.source_tests[0]" };
    }
  }

  return { contentTestId: wrapperTestId, resolvedBy: "wrapper_no_sources" };
}

/**
 * Resolve persona code A1..D5 even when combined_profile_code is e.g. FLOW_ORBIT
 * This is ONLY for debugging / compatibility; the real persona lookup below uses:
 *   personality_code (A/B/C/D) + mindset_level (1..5)
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

  // (2) profile.profile_code might be B4 in some datasets
  const pcode = String(profile?.profile_code || "").trim();
  if (looksLikePersonaCode(pcode)) {
    return {
      personaCode: pcode.toUpperCase(),
      source: "qsc_profiles.profile_code",
    };
  }

  // (3) derive from personality + mindset_level
  const letter =
    personalityToLetter(profile?.personality_code) ||
    personalityToLetter(resultRow.primary_personality);

  const level =
    typeof profile?.mindset_level === "number" &&
    Number.isFinite(profile.mindset_level)
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
    let resolvedBy:
      | "token+taker_id"
      | "token_unique"
      | "token_latest"
      | "result_id"
      | null = null;

    // (0) If token is a UUID, allow direct qsc_results.id lookup
    if (isUuidLike(tokenParam)) {
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

    // (1) token + tid (best / deterministic)
    if (!resultRow && tid && isUuidLike(tid)) {
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

    // (2) token only — must be unique or reject
    if (!resultRow) {
      const { count, error: countErr } = await sb
        .from("qsc_results")
        .select("id", { count: "exact", head: true })
        .eq("token", tokenParam);

      if (countErr) {
        return NextResponse.json(
          { ok: false, error: `qsc_results count failed: ${countErr.message}` },
          { status: 500 }
        );
      }

      const c = Number(count || 0);

      if (!tid && c > 1) {
        return NextResponse.json(
          {
            ok: false,
            error: "AMBIGUOUS_TOKEN_REQUIRES_TID",
            debug: {
              token: tokenParam,
              tid: tid || null,
              matches: c,
              hint:
                "Pass ?tid=<test_takers.id> when loading this report to disambiguate shared tokens.",
            },
          },
          { status: 409 }
        );
      }

      if (c === 1) {
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
          resolvedBy = "token_unique";
        }
      }

      // last resort (kept for edge cases)
      if (!resultRow && c > 0) {
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
    // Resolve persona_code A1..D5 (debug / compat only)
    // ---------------------------------------------------------------------
    const { personaCode, source: personaCodeSource } = resolvePersonaCode({
      resultRow,
      profile,
    });

    // ---------------------------------------------------------------------
    // ✅ Load persona content correctly
    //   Entrepreneur: portal.qsc_personas (your real table)
    //   Leader:       portal.qsc_leader_personas (if you have it)
    // ---------------------------------------------------------------------
    let persona: any = null;

    const letter =
      personalityToLetter(profile?.personality_code) ||
      personalityToLetter(resultRow.primary_personality);

    const level =
      typeof profile?.mindset_level === "number" && Number.isFinite(profile.mindset_level)
        ? Number(profile.mindset_level)
        : mindsetKeyToLevel(resultRow.primary_mindset);

    const combinedProfile = String(resultRow.combined_profile_code || "").trim().toUpperCase();

    const persona_debug: any = {
      table: null as string | null,
      method: null as string | null,
      persona_code: personaCode,
      persona_code_source: personaCodeSource,
      wrapper_test_id: wrapperTestId,
      content_test_id: contentTestId,
      content_resolved_by: contentResolvedBy,
      lookup_keys: {
        personality_code: letter,
        mindset_level: level,
        combined_profile_code: combinedProfile || null,
      },
    };

    if (audience === "leader") {
      persona_debug.table = "qsc_leader_personas";

      // Keep your existing leader logic as-is (since leader report looks great)
      if (personaCode) {
        const { data, error } = await sb
          .from("qsc_leader_personas")
          .select("*")
          .eq("test_id", contentTestId)
          .eq("profile_code", personaCode)
          .maybeSingle();

        if (!error && data) {
          persona = data;
          persona_debug.method = "test_id+profile_code";
        }
      }

      if (!persona && personaCode) {
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
      // ✅ Entrepreneur (Core) — your real table
      persona_debug.table = "qsc_personas";

      // (1) BEST: matches your unique index: test_id + personality_code + mindset_level
      if (letter && level) {
        const { data, error } = await sb
          .from("qsc_personas")
          .select("*")
          .eq("test_id", contentTestId)
          .eq("personality_code", letter)
          .eq("mindset_level", level)
          .maybeSingle();

        if (!error && data) {
          persona = data;
          persona_debug.method = "test_id+personality_code+mindset_level";
        }
      }

      // (2) Fallback: test_id + profile_code = FLOW_ORBIT (matches your row too)
      if (!persona && combinedProfile) {
        const { data, error } = await sb
          .from("qsc_personas")
          .select("*")
          .eq("test_id", contentTestId)
          .eq("profile_code", combinedProfile)
          .maybeSingle();

        if (!error && data) {
          persona = data;
          persona_debug.method = "test_id+profile_code(FLOW_ORBIT)";
        }
      }

      // (3) Fallback global: profile_code only
      if (!persona && combinedProfile) {
        const { data, error } = await sb
          .from("qsc_personas")
          .select("*")
          .eq("profile_code", combinedProfile)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          persona = data;
          persona_debug.method = "profile_code_global(FLOW_ORBIT)";
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


