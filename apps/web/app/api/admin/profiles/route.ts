import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Body = {
  company: string;
  goals: {
    industry?: string; sector?: string; primary_goal?: string;
    align_with_mission?: string; desired_outcomes?: string;
    audience?: string; audience_challenges?: string;
    other_insights?: string; industry_relevant_info?: string;
    standalone_or_program?: string; integration?: string;
    pricing_model?: "free" | "paid" | "tiered" | ""; price_point?: number | null;
  };
  profileName: string;
  frequencyName: string; // e.g., "Frequency A"
  brandTone?: string;    // optional; can be derived
};

function deriveTone(goals: Body["goals"], override?: string) {
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

    const sys = `You create concise, practical reports. Avoid fluff. Keep paragraphs short.`;
    const user = `
Company: ${body.company}
Tone: ${tone}

Profile to draft:
- Profile: ${body.profileName}
- Frequency: ${body.frequencyName}

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
Draft a report with the following 10 sections. Use the tone, keep it specific to the context, and avoid generic cliches.

Return STRICT JSON with this exact shape:
{
  "intro": "Welcome paragraph (2–3 sentences).",
  "howTo": "How to use the report (2–3 sentences).",
  "coreOverview": {
    "profileInDepth": "1 short paragraph describing ${body.profileName} in this organization & sector.",
    "frequencyName": "${body.frequencyName}"
  },
  "idealEnvironment": "1 short paragraph tailored to outcomes & audience.",
  "strengths": ["bullet A","bullet B","bullet C"],
  "challenges": ["bullet A","bullet B","bullet C"],
  "idealRoles": "1 short paragraph mapping to roles or functions.",
  "guidance": "2 short, practical paragraphs with actions.",
  "realWorldExamples": "1 short paragraph with concrete examples in this industry/sector.",
  "additionalInfo": ""
}
Only output JSON.
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
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Draft failed" }, { status: 400 });
  }
}
