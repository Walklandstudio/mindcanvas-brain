// apps/web/app/api/public/qsc/[token]/result/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

export const dynamic = "force-dynamic";

// Shape of the qsc_results row we expect from Supabase
type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null;
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
  personality_code: string | null; // 'A' | 'B' | 'C' | 'D'
  mindset_level: number | null; // 1..5
  profile_code: string | null;
  profile_label: string | null;
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
};

type QscPersonaRow = {
  id: string;
  test_id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;

  show_up_summary: string | null;
  energisers: string | null;
  drains: string | null;
  communication_long: string | null;
  admired_for: string | null;
  stuck_points: string | null;

  one_page_strengths: string | null;
  one_page_risks: string | null;

  combined_strengths: string | null;
  combined_risks: string | null;
  combined_big_lever: string | null;

  emotional_stabilises: string | null;
  emotional_destabilises: string | null;
  emotional_patterns_to_watch: string | null;

  decision_style_long: string | null;
  support_yourself: string | null;

  strategic_priority_1: string | null;
  strategic_priority_2: string | null;
  strategic_priority_3: string | null;
};

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  }

  const sb = supa();

  // 1) Load QSC result row for this link token
  const {
    data: resultData,
    error: resErr,
  } = await sb
    .from("qsc_results")
    .select(
      [
        "id",
        "test_id",
        "token",
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
      ].join(", ")
    )
    .eq("token", token)
    .maybeSingle();

  if (resErr) {
    return NextResponse.json(
      { ok: false, error: resErr.message },
      { status: 500 }
    );
  }

  const result = (resultData as QscResultsRow | null) ?? null;

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "No QSC result found for this token" },
      { status: 404 }
    );
  }

  // 2) Load QSC profile (sales playbook snapshot)
  let profile: QscProfileRow | null = null;
  if (result.qsc_profile_id) {
    const {
      data: profData,
      error: profErr,
    } = await sb
      .from("qsc_profiles")
      .select(
        [
          "id",
          "personality_code",
          "mindset_level",
          "profile_code",
          "profile_label",
          "how_to_communicate",
          "decision_style",
          "business_challenges",
          "trust_signals",
          "offer_fit",
          "sale_blockers",
        ].join(", ")
      )
      .eq("id", result.qsc_profile_id)
      .maybeSingle();

    if (profErr) {
      console.error("QSC API: qsc_profiles load error", profErr);
    } else {
      profile = (profData as QscProfileRow | null) ?? null;
    }
  }

  // 3) Load richer persona content from portal.qsc_personas (Entrepreneur-enhanced)
  let persona: QscPersonaRow | null = null;

  // Primary path: use personality_code + mindset_level from qsc_profiles
  if (profile?.personality_code && profile?.mindset_level != null) {
    const {
      data: personaData,
      error: personaErr,
    } = await sb
      .from("qsc_personas")
      .select(
        [
          "id",
          "test_id",
          "personality_code",
          "mindset_level",
          "profile_code",
          "profile_label",
          "show_up_summary",
          "energisers",
          "drains",
          "communication_long",
          "admired_for",
          "stuck_points",
          "one_page_strengths",
          "one_page_risks",
          "combined_strengths",
          "combined_risks",
          "combined_big_lever",
          "emotional_stabilises",
          "emotional_destabilises",
          "emotional_patterns_to_watch",
          "decision_style_long",
          "support_yourself",
          "strategic_priority_1",
          "strategic_priority_2",
          "strategic_priority_3",
        ].join(", ")
      )
      .eq("test_id", result.test_id)
      .eq("personality_code", profile.personality_code)
      .eq("mindset_level", profile.mindset_level)
      .maybeSingle();

    if (personaErr) {
      console.error("QSC API: qsc_personas load error", personaErr);
    } else {
      persona = (personaData as QscPersonaRow | null) ?? null;
    }
  }

  // Fallback: if for some reason there is no matching row above, try profile_code
  if (!persona && result.combined_profile_code) {
    const {
      data: personaData2,
      error: personaErr2,
    } = await sb
      .from("qsc_personas")
      .select(
        [
          "id",
          "test_id",
          "personality_code",
          "mindset_level",
          "profile_code",
          "profile_label",
          "show_up_summary",
          "energisers",
          "drains",
          "communication_long",
          "admired_for",
          "stuck_points",
          "one_page_strengths",
          "one_page_risks",
          "combined_strengths",
          "combined_risks",
          "combined_big_lever",
          "emotional_stabilises",
          "emotional_destabilises",
          "emotional_patterns_to_watch",
          "decision_style_long",
          "support_yourself",
          "strategic_priority_1",
          "strategic_priority_2",
          "strategic_priority_3",
        ].join(", ")
      )
      .eq("test_id", result.test_id)
      .eq("profile_code", result.combined_profile_code)
      .maybeSingle();

    if (personaErr2) {
      console.error("QSC API: qsc_personas fallback load error", personaErr2);
    } else {
      persona = (personaData2 as QscPersonaRow | null) ?? null;
    }
  }

  return NextResponse.json({
    ok: true,
    results: result,
    profile,
    persona,
  });
}

