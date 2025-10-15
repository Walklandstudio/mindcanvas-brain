import { NextResponse } from "next/server";
import OpenAI from "openai";

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

type Body = {
  company: string;
  brandTone?: string; // optional; if omitted we derive a tone from goals
  goals: Goals;
  profiles: { name: string; frequency: "A" | "B" | "C" | "D" }[];
};

function deriveTone(goals: Goals, override?: string) {
  if (override && override.trim()) return override;
  // very light heuristic tone based on sector/industry
  const base = (goals.sector || goals.industry || "").toLowerCase();
  if (base.includes("education")) return "supportive, clear, empowering";
  if (base.includes("finance")) return "confident, precise, trustworthy";
  if (base.includes("health")) return "reassuring, expert, humane";
  if (base.includes("startup") || base.includes("technology")) return "modern, energetic, pragmatic";
  return "confident, modern, human";
}

export async function POST(req: Request) {
  try {
    const { company, brandTone, goals, profiles } = (await req.json()) as Body;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!client.apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    const tone = deriveTone(goals, brandTone);

    const sys = `You write ultra-concise, high-signal product copy.`;
    const user = `
Company: ${company}
Tone: ${tone}

Context (from onboarding):
- Industry: ${goals.industry || "—"}
- Sector: ${goals.sector || "—"}
- Primary goal of the test: ${goals.primary_goal || "—"}
- Mission alignment: ${goals.align_with_mission || "—"}
- Desired outcomes: ${goals.desired_outcomes || "—"}
- Audience: ${goals.audience || "—"}
- Audience challenges: ${goals.audience_challenges || "—"}
- Integration: ${goals.integration || "—"}
- Pricing model: ${goals.pricing_model || "—"}
- Other insights: ${goals.other_insights || "—"}
- Industry-relevant info: ${goals.industry_relevant_info || "—"}

Profiles to describe (with frequencies):
${profiles.map(p => `- ${p.name} (Frequency ${p.frequency})`).join("\n")}

Task:
For each profile above, write a SINGLE blurb (1–2 sentences, max ~28 words) that:
- reflects the tone
- ties to the primary goal and audience
- hints at the value this profile adds

Return STRICT JSON:
{
  "items": [
    { "key": "A:Visionary", "name": "Visionary", "frequency": "A", "blurb": "..." },
    ...
  ]
}
Use the exact "key" format: "<frequency>:<name>".
`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const json = JSON.parse(resp.choices[0]?.message?.content || "{}");
    return NextResponse.json({ ok: true, blurbs: json.items || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to build blurbs" }, { status: 400 });
  }
}
