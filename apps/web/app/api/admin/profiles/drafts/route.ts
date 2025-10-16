export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import {
  buildProfileCopy,
  draftReportSections,
} from "../../../../_lib/ai";

/**
 * POST /api/admin/profiles/drafts
 * Body: { name: string; frequency: "A"|"B"|"C"|"D" }
 * Uses onboarding "goals" to set tone/industry/sector, then asks AI for copy.
 * Returns a JSON payload that the editor renders.
 */
export async function POST(req: Request) {
  try {
    const { name, frequency } = (await req.json()) ?? {};
    if (!name || !frequency) {
      return NextResponse.json(
        { error: "Missing profile name or frequency" },
        { status: 400 }
      );
    }

    // Try to pull onboarding "goals" for context (org-agnostic fallback included)
    // If you later scope by orgId or userId, add it here.
    const sb = getServiceClient();
    let goalsTone = "confident, modern, human";
    let goalsIndustry = "General";
    let goalsSector = "General";
    let goalsCompany = "Your Organization";

    // try a generic goals table if present
    const goals = await sb.from("onboarding_steps").select("step,data").eq("step","goals").maybeSingle();
    const data = goals?.data?.data ?? goals?.data; // tolerate different shapes

    if (data) {
      goalsTone = (data.brand_tone || data.brandTone || goalsTone) as string;
      goalsIndustry = (data.industry || goalsIndustry) as string;
      goalsSector = (data.sector || goalsSector) as string;
      goalsCompany = (data.company || data.org_name || goalsCompany) as string;
    }

    // Ask AI for short card copy + full report sections (safe fallbacks inside)
    const short = await buildProfileCopy({
      brandTone: goalsTone,
      industry: goalsIndustry,
      sector: goalsSector,
      company: goalsCompany,
      frequencyName: frequency,
      profileName: name,
    });

    const full = await draftReportSections({
      brandTone: goalsTone,
      industry: goalsIndustry,
      sector: goalsSector,
      company: goalsCompany,
      frequencyName: frequency,
      profileName: name,
    });

    // Build the 10 sections the editor expects
    const payload = {
      profile: {
        name,
        frequency,
      },
      meta: {
        brandTone: goalsTone,
        industry: goalsIndustry,
        sector: goalsSector,
        company: goalsCompany,
      },
      card: {
        summary: short.summary,
        strengths: short.strengths, // array of 3 items
      },
      sections: {
        // Section 1 – Welcome / Introduction
        intro: `Welcome to your ${name} profile. This draft is tuned to ${goalsCompany} (${goalsIndustry}/${goalsSector}) and written in a “${goalsTone}” tone.`,

        // Section 2 – How to use the report
        how_to_use:
          "Use this report as a practical guide: skim the overview, review strengths and challenges, note ideal roles/environments, and apply the guidance section to create an immediate action plan.",

        // Section 3 – Core Overview (profile + frequency)
        core_overview: `Profile in Depth: ${name}\nFrequency: ${frequency}`,

        // Section 4 – Ideal Environment
        ideal_env:
          full?.roles ||
          "A supportive environment that values this profile’s contribution and provides clarity, feedback, and opportunities for impact.",

        // Section 5 – Strengths (render as a list in the UI)
        strengths:
          (Array.isArray(short.strengths) ? short.strengths.join("\n") : "") ||
          "Strength 1\nStrength 2\nStrength 3",

        // Section 6 – Challenges
        challenges: full?.challenges || "Two short paragraphs on common challenges.",

        // Section 7 – Ideal Roles
        ideal_roles:
          full?.roles || "1–2 short paragraphs describing suitable roles.",

        // Section 8 – Guidance
        guidance:
          full?.guidance ||
          "Two short paragraphs with practical guidance aligned to the company context.",

        // Section 9 – Real-World Examples (2)
        examples:
          "• Example 1: A representative person or team that demonstrates this profile in action.\n• Example 2: Another concise example with impact/results.",

        // Section 10 – Additional Information (starts empty)
        additional: "",
      },
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    // Surface helpful error if OPENAI_API_KEY is missing
    const msg = e?.message || "Failed to generate draft";
    const hint =
      /OPENAI_API_KEY/i.test(msg)
        ? "OPENAI_API_KEY missing in Vercel env."
        : undefined;
    return NextResponse.json(
      { error: hint ? `${msg}. ${hint}` : msg },
      { status: 500 }
    );
  }
}

// Disallow other verbs explicitly so failures are obvious
export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
