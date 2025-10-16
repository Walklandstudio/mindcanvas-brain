// apps/web/app/api/admin/profiles/draft/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  buildProfileCopy,
  draftReportSections,
} from "@/app/_lib/ai";

/**
 * POST /api/admin/profiles/draft
 * Body:
 * {
 *   name: string,
 *   frequency: "A" | "B" | "C" | "D",
 *   brandTone?: string,
 *   industry?: string,
 *   sector?: string,
 *   company?: string
 * }
 *
 * Returns JSON with the 10 sections required by the editor.
 * Never throws — on any upstream error it returns a fallback JSON payload.
 */
export async function POST(req: Request) {
  // small helpers
  const safe = <T,>(x: T, fb: T) => (x === undefined || x === null ? fb : x);
  const fallbackCopy = {
    summary: "Concise positioning statement for this profile.",
    strengths: ["Strength 1", "Strength 2", "Strength 3"],
  };
  const fallbackSections = {
    strengths: "Two concise paragraphs on key strengths.",
    challenges: "Two concise paragraphs on common challenges.",
    roles: "Short guidance on ideal roles.",
    guidance: "Practical guidance in two short paragraphs.",
  };

  try {
    const body = await req.json().catch(() => ({} as any));
    const name = safe<string>(body?.name, "Profile");
    const frequency = safe<"A" | "B" | "C" | "D">(body?.frequency, "A");
    const brandTone = safe<string>(body?.brandTone, "confident, modern, human");
    const industry = safe<string>(body?.industry, "General");
    const sector = safe<string>(body?.sector, "General");
    const company = safe<string>(body?.company, "Your Organization");

    // Ask AI for a short card blurb + strengths (robust to missing key)
    let copy = fallbackCopy;
    try {
      copy = await buildProfileCopy({
        brandTone,
        industry,
        sector,
        company,
        frequencyName: frequency,
        profileName: name,
      });
      // harden shape
      copy = {
        summary: typeof copy?.summary === "string" ? copy.summary : fallbackCopy.summary,
        strengths: Array.isArray(copy?.strengths) && copy.strengths.length
          ? copy.strengths.slice(0, 3).map(String)
          : fallbackCopy.strengths,
      };
    } catch {
      copy = fallbackCopy;
    }

    // Ask AI for the long sections (robust)
    let sections = fallbackSections as any;
    try {
      sections = await draftReportSections({
        brandTone,
        industry,
        sector,
        company,
        frequencyName: frequency,
        profileName: name,
      });
      sections = {
        strengths: String(sections?.strengths || fallbackSections.strengths),
        challenges: String(sections?.challenges || fallbackSections.challenges),
        roles: String(sections?.roles || fallbackSections.roles),
        guidance: String(sections?.guidance || fallbackSections.guidance),
      };
    } catch {
      sections = fallbackSections;
    }

    // Compose the 10 editor sections you specified
    const payload = {
      meta: {
        name,
        frequency,
        brandTone,
        industry,
        sector,
        company,
      },
      // Section 1
      welcome: `Welcome to the ${name} profile. This draft is tailored to ${company} in ${industry}/${sector}.`,
      // Section 2
      how_to_use:
        "Use this report to understand the profile’s tendencies, strengths, and common blindspots. Share it with managers and teammates for better collaboration.",
      // Section 3
      core_overview: {
        profile_in_depth: `${name} — overview and positioning`,
        frequency_label: frequency,
        summary: copy.summary,
      },
      // Section 4
      ideal_environment:
        "AI-suggested environment based on onboarding inputs — focus, rituals, and operating norms that help this profile thrive.",
      // Section 5
      strengths: copy.strengths,
      // Section 6
      challenges: sections.challenges,
      // Section 7
      ideal_roles: sections.roles,
      // Section 8
      guidance: sections.guidance,
      // Section 9
      real_world_examples:
        "Two examples will be suggested by AI in the editor. Use public figures or anonymized internal examples.",
      // Section 10
      additional_info: "",
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    // Absolute last-resort JSON (never return empty/HTML)
    return NextResponse.json(
      {
        error: e?.message || "draft-failed",
        // minimal but valid fallback so the client can still render
        meta: { name: "Profile", frequency: "A" },
        welcome: "Welcome.",
        how_to_use: "How to use this report.",
        core_overview: {
          profile_in_depth: "Profile — overview and positioning",
          frequency_label: "A",
          summary: "Concise positioning statement.",
        },
        ideal_environment: "Suggested environment.",
        strengths: ["Strength 1", "Strength 2", "Strength 3"],
        challenges: "Common challenges.",
        ideal_roles: "Ideal roles.",
        guidance: "Practical guidance.",
        real_world_examples: "Two example placeholders.",
        additional_info: "",
      },
      { status: 200 },
    );
  }
}
