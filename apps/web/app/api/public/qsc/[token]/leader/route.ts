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

type JsonContent = { text?: string } | null;

type LeaderTemplateKey = "introduction" | "how_to_use";

type LeaderPersonaSectionKey =
  | "quantum_profile_summary"
  | "personality_layer"
  | "mindset_layer"
  | "combined_quantum_pattern"
  | "strategic_leadership_priorities"
  | "leadership_action_plan_30_day"
  | "leadership_roadmap"
  | "communication_and_decision_style"
  | "reflection_prompts"
  | "one_page_quantum_summary";

type QscLeaderReportTemplateRow = {
  id: string;
  test_id: string;
  section_key: LeaderTemplateKey;
  content: JsonContent;
  sort_order: number;
  is_active: boolean;
};

type QscLeaderReportSectionRow = {
  id: string;
  test_id: string;
  persona_code: string; // A1..D5
  section_key: LeaderPersonaSectionKey;
  content: JsonContent;
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

    // Load profile snapshot (needed for label fallback)
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

    const testId = results.test_id;
    const personaCode = results.combined_profile_code ?? null;

    // ✅ Templates (global): introduction, how_to_use
    const { data: templateRows, error: tmplErr } = await sb
      .from("qsc_leader_report_templates")
      .select("id, test_id, section_key, content, sort_order, is_active")
      .eq("test_id", testId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (tmplErr) {
      return NextResponse.json(
        { ok: false, error: `qsc_leader_report_templates load failed: ${tmplErr.message}` },
        { status: 500 }
      );
    }

    // ✅ Persona sections (A1..D5): 1–10 keys
    let sectionRows: QscLeaderReportSectionRow[] = [];
    if (personaCode) {
      const { data: rows, error: secErr } = await sb
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

      sectionRows = (rows ?? []) as unknown as QscLeaderReportSectionRow[];
    }

    return NextResponse.json(
      {
        ok: true,
        results,
        profile,
        taker,
        templates: (templateRows ?? []) as unknown as QscLeaderReportTemplateRow[],
        sections: sectionRows,
        __debug: {
          token: tokenParam,
          tid: tid || null,
          resolved_by: resolvedBy,
          test_id: testId,
          persona_code: personaCode,
          templates_count: (templateRows ?? []).length,
          sections_count: sectionRows.length,
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
