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

type QscLeaderPersonaRow = {
  id: string;
  test_id: string;
  personality_code: PersonalityKey;
  mindset_level: number;
  profile_code: string;
  profile_label: string;
  sections: any | null;
  // allow extra columns without TS fuss
  [key: string]: any;
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
    const tid = url.searchParams.get("tid"); // optional

    const sb = supa();

    // -----------------------------
    // 1) Results row
    // -----------------------------
    const resultsQuery = sb
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
      .eq("token", token);

    // Only keep this if tid is actually the qsc_results.id in your flow.
    if (tid) resultsQuery.eq("id", tid);

    const resultsResp = await resultsQuery.maybeSingle();
    if (resultsResp.error) {
      return NextResponse.json(
        { ok: false, error: resultsResp.error.message },
        { status: 500 }
      );
    }

    const resultsRow = resultsResp.data as unknown as QscResultsRow | null;

    if (!resultsRow) {
      return NextResponse.json(
        { ok: false, error: "RESULT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // -----------------------------
    // 2) Profile row (optional)
    // -----------------------------
    let profile: QscProfileRow | null = null;

    if (resultsRow.qsc_profile_id) {
      const profResp = await sb
        .from("qsc_profiles")
        .select("id, personality_code, mindset_level, profile_code, profile_label")
        .eq("id", resultsRow.qsc_profile_id)
        .maybeSingle();

      if (!profResp.error && profResp.data) {
        profile = profResp.data as unknown as QscProfileRow;
      }
    }

    // -----------------------------
    // 3) Persona (leader vs entrepreneur)
    // -----------------------------
    const combinedCode = resultsRow.combined_profile_code;

    let persona: any | null = null;

    if (resultsRow.audience === "leader") {
      // Try exact match on profile_code first
      if (combinedCode) {
        const pResp = await sb
          .from("qsc_leader_personas")
          .select("*")
          .eq("test_id", resultsRow.test_id)
          .eq("profile_code", combinedCode)
          .maybeSingle();

        if (!pResp.error && pResp.data) {
          persona = pResp.data as unknown as QscLeaderPersonaRow;
        }
      }

      // Fallback match on personality_code + mindset_level
      if (!persona && profile?.personality_code && profile?.mindset_level) {
        const p2Resp = await sb
          .from("qsc_leader_personas")
          .select("*")
          .eq("test_id", resultsRow.test_id)
          .eq("personality_code", profile.personality_code)
          .eq("mindset_level", profile.mindset_level)
          .maybeSingle();

        if (!p2Resp.error && p2Resp.data) {
          persona = p2Resp.data as unknown as QscLeaderPersonaRow;
        }
      }
    } else {
      // entrepreneur
      if (combinedCode) {
        const pResp = await sb
          .from("qsc_personas")
          .select("*")
          .eq("test_id", resultsRow.test_id)
          .eq("profile_code", combinedCode)
          .maybeSingle();

        if (!pResp.error && pResp.data) persona = pResp.data as any;
      }
    }

    // Parse sections if present
    if (persona && typeof persona === "object" && "sections" in persona) {
      persona.sections = safeParseSections((persona as any).sections);
    }

    return NextResponse.json({
      ok: true,
      results: resultsRow,
      profile,
      persona,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e || "Unknown error") },
      { status: 500 }
    );
  }
}
