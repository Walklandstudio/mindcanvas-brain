// apps/web/app/api/public/qsc/[token]/leader/route.ts
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
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
};

type QscTakerRow = {
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

type TemplateRow = {
  id: string;
  test_id: string;
  section_key: string;
  content: any;
  sort_order: number;
  is_active: boolean;
};

type PersonaSectionRow = {
  id: string;
  test_id: string;
  persona_code: string;
  section_key: string;
  content: any;
  sort_order: number;
  is_active: boolean;
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

function safeJsonParse(v: any) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return null;
  if (!(s.startsWith("{") || s.startsWith("["))) return v;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
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

function normalizeSlug(s: any) {
  return String(s || "").trim().toLowerCase();
}

/**
 * Resolve wrapper test_id -> canonical content test_id (LEADER)
 * - Wrapper identified by tests.meta.wrapper === true
 * - Uses meta.source_tests + meta.default_source_test
 * - Picks by slug: leader => qsc-leaders
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

    if (defaultSource && isUuidLike(defaultSource)) {
      return {
        contentTestId: defaultSource,
        resolvedBy: "meta.default_source_test",
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
 * Resolve persona code A1..D5 using same strategy as result endpoint
 */
function resolvePersonaCode(args: {
  resultRow: QscResultsRow;
  profile: QscProfileRow | null;
}): { personaCode: string | null; source: string | null } {
  const { resultRow, profile } = args;

  const combinedRaw = String(resultRow.combined_profile_code || "").trim();

  if (looksLikePersonaCode(combinedRaw)) {
    return {
      personaCode: combinedRaw.toUpperCase(),
      source: "qsc_results.combined_profile_code",
    };
  }

  const pcode = String(profile?.profile_code || "").trim();
  if (looksLikePersonaCode(pcode)) {
    return {
      personaCode: pcode.toUpperCase(),
      source: "qsc_profiles.profile_code",
    };
  }

  const letter =
    personalityToLetter(profile?.personality_code) ||
    personalityToLetter(resultRow.primary_personality);

  const level =
    typeof profile?.mindset_level === "number" &&
    Number.isFinite(profile.mindset_level)
      ? Number(profile.mindset_level)
      : null;

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

    const resultSelect = `
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

    let results: QscResultsRow | null = null;
    let resolvedBy:
      | "result_id"
      | "token+taker_id"
      | "token_unique"
      | "token_latest"
      | null = null;

    // (0) If token is a UUID, allow direct qsc_results.id lookup
    if (isUuidLike(tokenParam)) {
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
      if (data) {
        results = data as unknown as QscResultsRow;
        resolvedBy = "result_id";
      }
    }

    // (1) token + tid (deterministic)
    if (!results && tid && isUuidLike(tid)) {
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
      if (data) {
        results = data as unknown as QscResultsRow;
        resolvedBy = "token+taker_id";
      }
    }

    // (2) token only — MUST be unique OR we reject
    if (!results) {
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
        if (data) {
          results = data as unknown as QscResultsRow;
          resolvedBy = "token_unique";
        }
      }

      // last-resort fallback (kept for edge cases)
      if (!results && c > 0) {
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
        if (data) {
          results = data as unknown as QscResultsRow;
          resolvedBy = "token_latest";
        }
      }
    }

    if (!results) {
      return NextResponse.json(
        {
          ok: false,
          error: "RESULT_NOT_FOUND",
          debug: { token: tokenParam, tid: tid || null },
        },
        { status: 404 }
      );
    }

    // Leader-only endpoint
    if (results.audience && results.audience !== "leader") {
      return NextResponse.json(
        {
          ok: false,
          error: "WRONG_AUDIENCE",
          debug: { expected: "leader", got: results.audience },
        },
        { status: 400 }
      );
    }

    // ✅ wrapper -> canonical content test (qsc-leaders)
    const wrapperTestId = String(results.test_id);
    const { contentTestId, resolvedBy: contentResolvedBy } =
      await resolveContentTestId(sb, wrapperTestId, "leader");

    // Load taker
    let taker: QscTakerRow | null = null;

    if (results.taker_id) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", results.taker_id)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `test_takers load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) taker = data as unknown as QscTakerRow;
    }

    if (!taker) {
      const { data, error } = await sb
        .from("test_takers")
        .select("id, first_name, last_name, email, company, role_title, link_token")
        .eq("link_token", results.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `test_takers fallback load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) taker = data as unknown as QscTakerRow;
    }

    // Load profile snapshot (needed for persona_code resolution)
    let profile: QscProfileRow | null = null;

    if (results.qsc_profile_id) {
      const { data, error } = await sb
        .from("qsc_profiles")
        .select("id, personality_code, mindset_level, profile_code, profile_label")
        .eq("id", results.qsc_profile_id)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_profiles load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) profile = data as unknown as QscProfileRow;
    }

    // ✅ persona_code A1..D5
    const { personaCode, source: personaCodeSource } = resolvePersonaCode({
      resultRow: results,
      profile,
    });

    // Templates (per canonical content test)
    const { data: templateRows, error: tplErr } = await sb
      .from("qsc_leader_report_templates")
      .select("id, test_id, section_key, content, sort_order, is_active")
      .eq("test_id", contentTestId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (tplErr) {
      return NextResponse.json(
        {
          ok: false,
          error: `qsc_leader_report_templates load failed: ${tplErr.message}`,
        },
        { status: 500 }
      );
    }

    // Persona sections (canonical content test + persona_code)
    let sectionRows: PersonaSectionRow[] = [];
    if (personaCode) {
      const { data: secRows, error: secErr } = await sb
        .from("qsc_leader_report_sections")
        .select("id, test_id, persona_code, section_key, content, sort_order, is_active")
        .eq("test_id", contentTestId)
        .eq("persona_code", personaCode)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (secErr) {
        return NextResponse.json(
          {
            ok: false,
            error: `qsc_leader_report_sections load failed: ${secErr.message}`,
          },
          { status: 500 }
        );
      }

      sectionRows = (secRows ?? []) as any;
    }

    const templates = (templateRows ?? []).map((r: any) => ({
      ...r,
      content: safeJsonParse(r.content),
    })) as TemplateRow[];

    const sections = (sectionRows ?? []).map((r: any) => ({
      ...r,
      content: safeJsonParse(r.content),
    })) as PersonaSectionRow[];

    return NextResponse.json(
      {
        ok: true,
        results,
        profile,
        taker,
        report: {
          test_id: contentTestId,
          persona_code: personaCode,
          templates,
          sections,
        },
        __debug: {
          token: tokenParam,
          tid: tid || null,
          resolved_by: resolvedBy,
          audience: "leader",
          wrapper_test_id: wrapperTestId,
          content_test_id: contentTestId,
          content_resolved_by: contentResolvedBy,
          persona_code: personaCode,
          persona_code_source: personaCodeSource,
          combined_profile_code_raw: results.combined_profile_code ?? null,
          profile_code: profile?.profile_code ?? null,
          profile_personality_code: profile?.personality_code ?? null,
          profile_mindset_level: profile?.mindset_level ?? null,
          template_count: templates.length,
          section_count: sections.length,
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

