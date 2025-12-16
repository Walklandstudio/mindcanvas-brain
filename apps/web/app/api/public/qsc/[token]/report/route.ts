import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token in URL" }, { status: 400 });
    }

    const url = new URL(req.url);
    const tid = url.searchParams.get("tid") || "";

    const sb = supa();

    // 1) Load the QSC results row
    // ✅ If tid is provided, load by taker_id (most precise)
    // ✅ Otherwise fall back to latest by token
    const q = sb
      .from("qsc_results")
      .select(
        `
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
      `
      )
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: resultRow, error: resErr } = tid
      ? await q.eq("taker_id", tid).maybeSingle()
      : await q.eq("token", token).maybeSingle();

    if (resErr) {
      return NextResponse.json({ ok: false, error: `qsc_results load failed: ${resErr.message}` }, { status: 500 });
    }
    if (!resultRow) {
      return NextResponse.json(
        { ok: false, error: "No QSC result found for this token", debug: { token, tid: tid || null } },
        { status: 404 }
      );
    }

    const testId: string = resultRow.test_id;
    const qscProfileId: string | null = resultRow.qsc_profile_id ?? null;

    // 2) Load profile
    let profile: any = null;
    if (qscProfileId) {
      const { data: profRow } = await sb
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
          created_at
        `
        )
        .eq("id", qscProfileId)
        .maybeSingle();

      profile = profRow ?? null;
    }

    // 3) Load report sections for this test
    const { data: sectionRows, error: secErr } = await sb
      .from("report_sections")
      .select(
        `
        id,
        section_key,
        title,
        content,
        persona_code,
        order_index,
        is_active
      `
      )
      .eq("test_id", testId)
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (secErr) {
      return NextResponse.json({ ok: false, error: `report_sections load failed: ${secErr.message}` }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, results: resultRow, profile, sections: sectionRows ?? [] },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error in QSC report endpoint" },
      { status: 500 }
    );
  }
}

