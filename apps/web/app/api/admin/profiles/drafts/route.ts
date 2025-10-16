export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import { buildProfileCopy, draftReportSections } from "../../../../_lib/ai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const sb = getServiceClient();
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,             // profile name e.g. "Visionary"
      frequency,        // "A" | "B" | "C" | "D"
      brandTone,        // optional override
      industry,         // optional override
      sector,           // optional override
      company,          // optional override
    } = body || {};

    if (!name || !frequency) {
      return NextResponse.json({ error: "Missing name or frequency" }, { status: 400 });
    }

    // Pull onboarding context as a fallback
    const ob = await sb
      .from("onboarding_steps")
      .select("data,company,brand_tone,industry,sector")
      .eq("org_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ctxData = ob.data?.data || {};
    const ctx = {
      brandTone: brandTone || ob.data?.brand_tone || ctxData.brandTone || "confident, modern, human",
      industry: industry || ob.data?.industry || ctxData.industry || "General",
      sector: sector || ob.data?.sector || ctxData.sector || "General",
      company: company || ob.data?.company || ctxData.company || "Your Organization",
    };

    // Ask AI for short blurb + sections
    const copy = await buildProfileCopy({
      brandTone: ctx.brandTone,
      industry: ctx.industry,
      sector: ctx.sector,
      company: ctx.company,
      frequencyName: frequency,
      profileName: name,
    });

    const sections = await draftReportSections({
      brandTone: ctx.brandTone,
      industry: ctx.industry,
      sector: ctx.sector,
      company: ctx.company,
      frequencyName: frequency,
      profileName: name,
    });

    // Upsert into drafts table (or store where you prefer)
    // If you don’t have a drafts table yet, just return the AI output to hydrate the editor.
    return NextResponse.json({
      ok: true,
      draft: {
        name,
        frequency,
        summary: copy.summary,
        strengths: copy.strengths,
        sections, // { strengths, challenges, roles, guidance }
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
