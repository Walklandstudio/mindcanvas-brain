import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Goals = {
  industry?: string; sector?: string; primary_goal?: string;
  align_with_mission?: string; desired_outcomes?: string;
  audience?: string; audience_challenges?: string;
  other_insights?: string; industry_relevant_info?: string;
  standalone_or_program?: string; integration?: string;
  pricing_model?: "free" | "paid" | "tiered" | ""; price_point?: number | null;
};

type Body = {
  company: string;
  goals: Goals;
  profileName: string;
  frequencyName: string;   // e.g., "Frequency A"
  brandTone?: string;      // optional; derived if omitted
};

function deriveTone(goals: Goals, override?: string) {
  if (override && override.trim()) return override;
  const base = (goals.sector || goals.industry || "").toLowerCase();
  if (base.includes("education")) return "supportive, clear, empowering";
  if (base.includes("finance")) return "confident, precise, trustworthy";
  if (base.includes("health")) return "reassuring, expert, humane";
  if (base.includes("startup") || base.includes("technology")) return "modern, energetic, pragmatic";
  return "confident, modern, human";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!client.apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    const tone = deriveTone(body.goals, body.brandTone);

    const sys = `You create concise, practical reports. Avoid filler. Prefer short paragraphs and concrete, industry-aware language.`;
    const user = `
Company: ${body.company}
Tone: ${tone}

Profile: ${body.profileName}
Frequency: ${body.frequencyName}

Onboarding context:
- Industry: ${body.goals.industry || "—"}
- Sector: ${body.goals.sector || "—"}
- Primary goal: ${body.goals.primary_goal || "—"}
- Mission alignment: ${body.goals.align_with_mission || "—"}
- Desired outcomes: ${body.goals.desired_outcomes || "—"}
- Audience: ${body.goals.audience || "—"}
- Audience challenges: ${body.goals.audience_challenges || "—"}
- Integration: ${body.goals.integration || "—"}
- Pricing model: ${body.goals.pricing_model || "—"}
- Other insights: ${body.goals.other_insights || "—"}
- Industry-relevant info: ${body.goals.industry_relevant_info || "—"}

Task:
Draft a report with the following EXACT JSON shape. Tailor everything to the above context.
Keep text crisp. Bullets should be short phrases (not long sentences).

{
  "intro": "2–3 sentence welcome.",
  "howTo": "2–3 sentences explaining how to use the report.",
  "coreOverview": {
    "profileInDepth": "1 short paragraph about ${body.profileName} in this company & sector.",
    "frequencyName": "${body.frequencyName}"
  },
  "idealEnvironment": "1 short paragraph tied to desired outcomes and audience.",
  "strengths": ["3–6 short bullets"],
  "challenges": ["3–6 short bullets"],
  "idealRoles": "1 short paragraph (map to real functions/teams).",
  "guidance": "2 short, actionable paragraphs.",
  "realWorldExamples": ["Two named examples of people (public figures or archetypes) who fit this profile in this industry/sector.", "Second example..."],
  "additionalInfo": ""
}

Return JSON only.
`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const json = JSON.parse(resp.choices[0]?.message?.content || "{}");
    // Ensure arrays are arrays and examples length is 2
    if (!Array.isArray(json.strengths)) json.strengths = [];
    if (!Array.isArray(json.challenges)) json.challenges = [];
    if (!Array.isArray(json.realWorldExamples)) json.realWorldExamples = [];
    json.realWorldExamples = json.realWorldExamples.slice(0, 2).concat(["", ""]).slice(0, 2);

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Draft failed" }, { status: 400 });
  }
}
