// apps/web/app/_lib/ai.ts
import OpenAI from "openai";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function suggestFrameworkNames(input: {
  industry?: string;
  sector?: string;
  brandTone?: string;
  primaryGoal?: string;
}) {
  const fallback = {
    frequencies: {
      A: "Vision & Innovation",
      B: "Connection & Influence",
      C: "Grounding & Timing",
      D: "Precision & Systems",
    },
    profiles: [
      { name: "The Initiator", frequency: "A" },
      { name: "The Influencer", frequency: "A" },
      { name: "The Connector", frequency: "B" },
      { name: "The Deal-Maker", frequency: "B" },
      { name: "The Coordinator", frequency: "C" },
      { name: "The Planner", frequency: "C" },
      { name: "The Controller", frequency: "D" },
      { name: "The Optimiser", frequency: "D" },
    ],
    imagePrompts: {
      A: "abstract emblem evoking vision and innovation in the client's brand colors",
      B: "abstract emblem evoking human connection and influence in the client's brand colors",
      C: "abstract emblem evoking grounding, rhythm, timing in the client's brand colors",
      D: "abstract emblem evoking precision and systems in the client's brand colors",
    },
  };

  const client = getOpenAI();
  if (!client) return fallback;

  const sys = `You are naming a 4-frequency, 8-profile framework for a corporate profiling product.
Frequencies (A–D) should be professional and brand-aligned.
Profiles (8) map 2 per frequency, unique, concise (<= 4 words).
Return JSON: {
 "frequencies": {"A":"...","B":"...","C":"...","D":"..."},
 "profiles": [{"name":"...","frequency":"A"}, ... 8 items],
 "imagePrompts": {"A":"...","B":"...","C":"...","D":"..."}
}`;
  const user = `Context:
Industry: ${input.industry ?? "-"}
Sector: ${input.sector ?? "-"}
Brand tone: ${input.brandTone ?? "confident, modern, human"}
Primary goal: ${input.primaryGoal ?? "-"}

Constraints:
- Professional, no cliches, no pop-culture.
- Exactly 8 profiles (2 per A/B/C/D).`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(resp.choices[0].message?.content || "{}");
    if (!parsed?.frequencies || !parsed?.profiles || !parsed?.imagePrompts) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}
