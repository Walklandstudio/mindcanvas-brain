// apps/web/app/api/public/qsc/[token]/result/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";
type Audience = "entrepreneur" | "leader";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;

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
  personality_code: PersonalityKey | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
};

type QscTakerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  role_title?: string | null;
};

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function safeParseSections(raw: any) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;

  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return { _error: "INVALID_JSON_IN_SECTIONS", _raw: raw };
    }
  }

  return null;
}

export async function GET(req: Request, ctx: { params: { token: string } }) {
  try {
    const token = ctx.params.token;
    const url = new URL(req.url);
    const tid = url.searchParams.get("tid"); // only used for taker lookup

    const sb = supa();

    // 1) Results row (NEVER filter by tid)
    const resultsResp = await sb
      .from("qsc_results")
      .select(
        [
          "id",
          "test_id",
          "token",
          "audience",
          "personality_totals",
          "personality_percentages",
          "mindset_totals",
          "mindset_percentages",
          "primary_personality",
          "secondary_personality",
          "primary_mindset",
          "secondary_mindset",
          "combined_profile_code",
          "qsc_profile_id",
          "created_at",
        ].join(",")
      )
      .eq("token", token)
      .maybeSingle();

    if (resultsResp.error) {
      return NextResponse.json(
        { ok: false, error: resultsResp.error.message },
        { status: 500 }
      );
    }

    const results = (resultsResp.data ?? null) as QscResultsRow | null;

    if (!results) {
      return NextResponse.json(
        { ok: false, error: "RESULT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2) Profile (optional)
    let profile: QscProfileRow | null = null;

    if (results.qsc_profile_id) {
      const profResp = await sb
        .from("qsc_profiles")
        .select("id, personality_code, mindset_level, profile_code, profile_label")
        .eq("id", results.qsc_profile_id)
        .maybeSingle();

      if (!profResp.error && profResp.data) {
        profile = profResp.data as QscProfileRow;
      }
    }

    // 3) Persona (leader vs entrepreneur)
    const combinedCode = results.combined_profile_code;

    let persona: any | null = null;

    if (results.audience === "leader") {
      // Exact profile_code match
      if (combinedCode) {
        const pResp = await sb
          .from("qsc_leader_personas")
          .select("*")
          .eq("test_id", results.test_id)
          .eq("profile_code", combinedCode)
          .maybeSingle();

        if (!pResp.error && pResp.data) persona = pResp.data;
      }

      // Fallback: personality_code + mindset_level from qsc_profiles
      if (!persona && profile?.personality_code && profile?.mindset_level) {
        const p2Resp = await sb
          .from("qsc_leader_personas")
          .select("*")
          .eq("test_id", results.test_id)
          .eq("personality_code", profile.personality_code)
          .eq("mindset_level", profile.mindset_level)
          .maybeSingle();

        if (!p2Resp.error && p2Resp.data) persona = p2Resp.data;
      }
    } else {
      // Entrepreneur personas table
      if (combinedCode) {
        const pResp = await sb
          .from("qsc_personas")
          .select("*")
          .eq("test_id", results.test_id)
          .eq("profile_code", combinedCode)
          .maybeSingle();

        if (!pResp.error && pResp.data) persona = pResp.data;
      }
    }

    if (persona && typeof persona === "object" && "sections" in persona) {
      persona.sections = safeParseSections((persona as any).sections);
    }

    // 4) Taker (best-effort; does not affect result finding)
    let taker: QscTakerRow | null = null;

    if (tid) {
      const tResp = await sb
        .from("qsc_test_takers")
        .select("id, first_name, last_name, email, company, role_title")
        .eq("id", tid)
        .maybeSingle();

      if (!tResp.error && tResp.data) taker = tResp.data as QscTakerRow;
    }

    return NextResponse.json({ ok: true, results, profile, persona, taker });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e || "Unknown error") },
      { status: 500 }
    );
  }
}

