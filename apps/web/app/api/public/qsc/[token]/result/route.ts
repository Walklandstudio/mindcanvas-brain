// apps/web/app/api/public/qsc/[token]/result/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
    const tid = String(url.searchParams.get("tid") || "").trim(); // expected: test_takers.id (UUID)

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

    // (1) token + tid (best / most precise)
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
      if (data) resultRow = data as unknown as QscResultsRow;
    }

    // (2) token only (latest)
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
      if (data) resultRow = data as unknown as QscResultsRow;
    }

    // (3) tokenParam might be qsc_results.id (UUID)
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

    const testId = resultRow.test_id;
    const qscProfileId = resultRow.qsc_profile_id ?? null;
    const combinedProfileCode = resultRow.combined_profile_code ?? null;
    const audience = (resultRow.audience ?? null) as Audience | null;

    // ---------------------------------------------------------------------
    // Load taker (prefer taker_id from results — DO NOT guess)
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

    // Fallback: if taker_id is null, try to match link_token to result token
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
    // Load QSC profile snapshot row
    // ---------------------------------------------------------------------
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
    // Load persona content
    // ---------------------------------------------------------------------
    let persona: any = null;
    let persona_debug: any = { table: null as string | null, method: null as string | null };

    if (combinedProfileCode) {
      if (audience === "leader") {
        persona_debug.table = "qsc_leader_personas";

        // 1) test-specific leader persona
        {
          const { data, error } = await sb
            .from("qsc_leader_personas")
            .select("*")
            .eq("test_id", testId)
            .eq("profile_code", combinedProfileCode)
            .maybeSingle();

          if (!error && data) {
            persona = data;
            persona_debug.method = "test_id+profile_code";
          }
        }

        // 2) global leader persona fallback (profile_code only)
        if (!persona) {
          const { data, error } = await sb
            .from("qsc_leader_personas")
            .select("*")
            .eq("profile_code", combinedProfileCode)
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            persona = data;
            persona_debug.method = "profile_code_global";
          }
        }
      } else {
        persona_debug.table = "qsc_personas";

        // Entrepreneur (keep your previous behavior)
        const { data, error } = await sb
          .from("qsc_personas")
          .select("*")
          .eq("profile_code", combinedProfileCode)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          persona = data;
          persona_debug.method = "profile_code";
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
          audience,
          combinedProfileCode,
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
