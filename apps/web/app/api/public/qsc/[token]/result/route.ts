import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ✅ use your existing shim

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: Partial<Record<PersonalityKey, number>> | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: Partial<Record<MindsetKey, number>> | null;
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null; // e.g. "FLOW_ORBIT"
  qsc_profile_id: string | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null; // e.g. "FLOW_ORBIT" / "FIRE_QUANTUM"
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
  profile_code: string | null; // should match qsc_profiles.profile_code
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
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  }

  // ✅ Use your existing admin client instance
  const supabase = supabaseAdmin;

  // 1) Fetch the QSC result for this token
  const { data: result, error: resultErr } = await supabase
    .from<QscResultsRow>("qsc_results") // adjust name if your table is exposed differently
    .select("*")
    .eq("token", token)
    .single();

  if (resultErr || !result) {
    return NextResponse.json(
      {
        ok: false,
        error:
          resultErr?.message ||
          "No QSC result found for this token. (qsc_results)",
      },
      { status: 404 }
    );
  }

  // 2) Fetch the QSC profile for this result
  let profile: QscProfileRow | null = null;

  if (result.qsc_profile_id) {
    const { data, error } = await supabase
      .from<QscProfileRow>("qsc_profiles")
      .select("*")
      .eq("id", result.qsc_profile_id)
      .single();

    if (error) {
      console.error("Error loading qsc_profile", error);
    } else {
      profile = data;
    }
  } else if (result.combined_profile_code) {
    const { data, error } = await supabase
      .from<QscProfileRow>("qsc_profiles")
      .select("*")
      .eq("profile_code", result.combined_profile_code)
      .maybeSingle();

    if (error) {
      console.error("Error loading qsc_profile by combined_profile_code", error);
    } else {
      profile = data ?? null;
    }
  }

  // 3) Fetch the persona for this test + profile_code (Strategic Growth Report)
  let persona: QscPersonaRow | null = null;

  const personaProfileCode =
    profile?.profile_code || result.combined_profile_code;

  if (personaProfileCode) {
    const { data, error } = await supabase
      .from<QscPersonaRow>("qsc_personas")
      .select("*")
      .eq("test_id", result.test_id)
      .eq("profile_code", personaProfileCode)
      .maybeSingle();

    if (error) {
      console.error("Error loading qsc_persona", error);
    } else {
      persona = data ?? null;
    }
  }

  return NextResponse.json({
    ok: true,
    results: result,
    profile,
    persona,
  });
}



