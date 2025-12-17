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

  combined_profile_code: string | null; // e.g. "C5" (what we want)
  qsc_profile_id: string | null;

  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null; // e.g. "FORM"
  mindset_level: number | null; // 1..5
  profile_code: string | null; // e.g. "FORM_QUANTUM"
  profile_label: string | null; // e.g. "Form Quantum"
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

type TemplateRow = {
  id: string;
  test_id: string;
  section_key: string;
  content: any; // jsonb
  sort_order: number;
  is_active: boolean;
};

type SectionRow = {
  id: string;
  test_id: string;
  persona_code: string; // "A1".."D5"
  section_key: string;
  content: any; // jsonb
  sort_order: number;
  is_active: boolean;
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

function isPersonaCode(s: string | null | undefined) {
  if (!s) return false;
  return /^[ABCD][1-5]$/i.test(String(s).trim());
}

/**
 * Fallback mapping if combined_profile_code is not present or not like "C5".
 * Converts profile_code like "FORM_QUANTUM" into "C5"
 */
function mapProfileCodeToPersonaCode(profileCode: string | null | undefined) {
  const s = String(profileCode || "").trim().toUpperCase();
  if (!s) return null;

  // expected shape: FIRE_ORIGIN, FLOW_VECTOR, FORM_QUANTUM, FIELD_ORBIT etc
  const parts = s.split("_");
  if (parts.length !== 2) return null;

  const [p, m] = parts;

  const pMap: Record<string, string> = {
    FIRE: "A",
    FLOW: "B",
    FORM: "C",
    FIELD: "D",
  };

  const mMap: Record<string, string> = {
    ORIGIN: "1",
    MOMENTUM: "2",
    VECTOR: "3",
    ORBIT: "4",
    QUANTUM: "5",
  };

  const letter = pMap[p];
  const num = mMap[m];

  if (!letter || !num) return null;
  return `${letter}${num}`;
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
    const tid = String(url.searchParams.get("tid") || "").trim(); // test_takers.id UUID

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
    let resolvedBy: "token+taker_id" | "token_latest" | "result_id" | null =
      null;

    // (1) token + tid (most precise)
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
      if (data) {
        results = data as unknown as QscResultsRow;
        resolvedBy = "token+taker_id";
      }
    }

    // (2) token only (latest)
    if (!results) {
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

    // (3) tokenParam might be qsc_results.id (UUID)
    if (!results && isUuidLike(tokenParam)) {
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

    // Hard guard: this endpoint is LEADER-only
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
        .select(
          "id, first_name, last_name, email, company, role_title, link_token"
        )
        .eq("link_token", results.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error: `test_takers fallback load failed: ${error.message}`,
          },
          { status: 500 }
        );
      }
      if (data) taker = data as unknown as QscTakerRow;
    }

    // Load profile snapshot (needed for labels / mapping fallback)
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

    if (!profile && results.combined_profile_code) {
      const { data, error } = await sb
        .from("qsc_profiles")
        .select("id, personality_code, mindset_level, profile_code, profile_label")
        .eq("profile_code", results.combined_profile_code)
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error: `qsc_profiles fallback load failed: ${error.message}`,
          },
          { status: 500 }
        );
      }
      if (data) profile = data as unknown as QscProfileRow;
    }

    // ✅ Resolve persona_code for the NEW section table
    const combinedProfileCodeRaw = (results.combined_profile_code || "").trim();
    const personaCode =
      (isPersonaCode(combinedProfileCodeRaw)
        ? combinedProfileCodeRaw.toUpperCase()
        : null) ||
      mapProfileCodeToPersonaCode(profile?.profile_code) ||
      null;

    const testId = results.test_id;

    // Load templates (global per test)
    const { data: templatesData, error: tplErr } = await sb
      .from("qsc_leader_report_templates")
      .select("id, test_id, section_key, content, sort_order, is_active")
      .eq("test_id", testId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (tplErr) {
      return NextResponse.json(
        { ok: false, error: `qsc_leader_report_templates load failed: ${tplErr.message}` },
        { status: 500 }
      );
    }

    // Load persona sections (per persona_code)
    let sectionsData: SectionRow[] = [];
    if (personaCode) {
      const { data, error: secErr } = await sb
        .from("qsc_leader_report_sections")
        .select("id, test_id, persona_code, section_key, content, sort_order, is_active")
        .eq("test_id", testId)
        .eq("persona_code", personaCode)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (secErr) {
        return NextResponse.json(
          { ok: false, error: `qsc_leader_report_sections load failed: ${secErr.message}` },
          { status: 500 }
        );
      }
      sectionsData = (data ?? []) as unknown as SectionRow[];
    }

    return NextResponse.json(
      {
        ok: true,
        results,
        profile,
        taker,
        templates: (templatesData ?? []) as unknown as TemplateRow[],
        sections: sectionsData,
        __debug: {
          token: tokenParam,
          tid: tid || null,
          resolved_by: resolvedBy,
          test_id: testId,
          persona_code: personaCode,
          combined_profile_code_raw: combinedProfileCodeRaw || null,
          profile_profile_code: profile?.profile_code ?? null,
          template_count: (templatesData ?? []).length,
          section_count: sectionsData.length,
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

