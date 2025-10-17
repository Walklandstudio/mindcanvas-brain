import { NextResponse } from "next/server";
import { suggestFrameworkNames } from "@/app/_lib/ai";

export const runtime = "nodejs";

type Goals = {
  industry?: string;
  sector?: string;
  primary_goal?: string;
  align_with_mission?: string;
  desired_outcomes?: string;
  audience?: string;
  audience_challenges?: string;
  other_insights?: string;
  industry_relevant_info?: string;
  standalone_or_program?: string;
  integration?: string;
  pricing_model?: "free" | "paid" | "tiered" | "";
  price_point?: number | null;
};

type SummaryBody = {
  // minimal context; client can pass what it has (or you can fetch server-side if you prefer)
  orgName?: string;
  goals: Goals;
  brandTone?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SummaryBody;
    const goals = body.goals || {};
    const brandTone = body.brandTone || "confident, modern, human";

    // Use your existing AI helper to propose frequency+profile names
    const proposal = await suggestFrameworkNames({
      industry: goals.industry || "General",
      sector: goals.sector || "General",
      brandTone,
      primaryGoal: goals.primary_goal || "Improve team performance",
    });

    // Lightweight AI-less summary composed from answers (can be replaced by another AI call if you prefer)
    const bullets = [
      goals.primary_goal && `Primary goal: ${goals.primary_goal}`,
      goals.align_with_mission && `Alignment: ${goals.align_with_mission}`,
      goals.desired_outcomes && `Desired outcomes: ${goals.desired_outcomes}`,
      goals.audience && `Audience: ${goals.audience}`,
      goals.audience_challenges && `Audience challenges: ${goals.audience_challenges}`,
      goals.integration && `Integration: ${goals.integration}`,
      goals.pricing_model && `Pricing model: ${goals.pricing_model}${goals.price_point ? ` (${goals.price_point})` : ""}`,
    ].filter(Boolean) as string[];

    return NextResponse.json({
      ok: true,
      summary: {
        orgName: body.orgName || "Your Organization",
        industry: goals.industry || "—",
        sector: goals.sector || "—",
        bullets,
        brandTone,
      },
      preview: {
        frequencies: proposal.frequencies,      // A..D -> name
        profiles: proposal.profiles,            // 8 items with name+frequency
        imagePrompts: proposal.imagePrompts,    // optional
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Summary failed" }, { status: 400 });
  }
}
