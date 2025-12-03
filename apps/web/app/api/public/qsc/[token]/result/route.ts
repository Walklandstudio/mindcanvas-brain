// apps/web/app/api/public/qsc/[token]/result/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AB_VALUES = ["A", "B", "C", "D"] as const;
type AB = (typeof AB_VALUES)[number];

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
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
  full_internal_insights: string | null;
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

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  persona: QscPersonaRow | null;
  taker: QscTakerRow | null;
};

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

export async function GET(
  req: Request,
  ctx: { params: { token: string } }
): Promise<Response> {
  const token = ctx.params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  }

  const s = supa();

  try {
    // 1) QSC RESULTS (core scores + profile mapping)
    const { data: resultRow, error: resultErr } = await s
      .from("qsc_results")
      .select("*")
      .eq("token", token)
      .maybeSingle<QscResultsRow>();

    if (resultErr) {
      console.error("qsc_results error", resultErr);
      return NextResponse.json(
        { ok: false, error: resultErr.message },
        { status: 500 }
      );
    }

    if (!resultRow) {
      return NextResponse.json(
        { ok: false, error: "No QSC results found for this token" },
        { status: 404 }
      );
    }

    // 2) PROFILE (sales/messaging profile, used by Extended Source Code)
    let profile: QscProfileRow | null = null;

    if (resultRow.qsc_profile_id) {
      const { data: profileRow, error: profileErr } = await s
        .from("qsc_profiles")
        .select("*")
        .eq("id", resultRow.qsc_profile_id)
        .maybeSingle<QscProfileRow>();

      if (profileErr) {
        console.error("qsc_profiles error", profileErr);
        return NextResponse.json(
          { ok: false, error: profileErr.message },
          { status: 500 }
        );
      }

      profile = profileRow ?? null;
    } else if (resultRow.combined_profile_code) {
      // fallback if qsc_profile_id is missing
      const { data: profileRow, error: profileErr } = await s
        .from("qsc_profiles")
        .select("*")
        .eq("profile_code", resultRow.combined_profile_code)
        .maybeSingle<QscProfileRow>();

      if (profileErr) {
        console.error("qsc_profiles (by profile_code) error", profileErr);
        return NextResponse.json(
          { ok: false, error: profileErr.message },
          { status: 500 }
        );
      }

      profile = profileRow ?? null;
    }

    // 3) PERSONA (Strategic Growth Report – deep personal layer)
    let persona: QscPersonaRow | null = null;

    if (profile && profile.profile_code) {
      // We scope persona by test_id so Entrepreneur vs Leader can have different personas
      const { data: personaRow, error: personaErr } = await s
        .from("qsc_personas")
        .select("*")
        .eq("test_id", resultRow.test_id)
        .eq("profile_code", profile.profile_code)
        .maybeSingle<QscPersonaRow>();

      if (personaErr) {
        console.error("qsc_personas error", personaErr);
        return NextResponse.json(
          { ok: false, error: personaErr.message },
          { status: 500 }
        );
      }

      persona = personaRow ?? null;
    }

    // 4) TEST TAKER (for the "For: Name" line in the header)
    let taker: QscTakerRow | null = null;

    const { data: takerRow, error: takerErr } = await s
      .from("test_takers")
      .select(
        "id, first_name, last_name, email, company, role_title"
      )
      .eq("link_token", token)
      .maybeSingle<QscTakerRow>();

    if (takerErr) {
      console.error("test_takers error", takerErr);
      return NextResponse.json(
        { ok: false, error: takerErr.message },
        { status: 500 }
      );
    }

    taker = takerRow ?? null;

    const payload: QscPayload = {
      results: resultRow,
      profile: profile ?? null,
      persona: persona ?? null,
      taker,
    };

    return NextResponse.json({ ok: true, ...payload }, { status: 200 });
  } catch (e: any) {
    console.error("Unexpected QSC result error", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

