// apps/web/app/_lib/ai.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/** Frequency + profile naming based on onboarding; includes safe fallbacks. */
export async function suggestFrameworkNames(input: {
  industry: string;
  sector: string;
  brandTone: string;
  primaryGoal: string;
}) {
  const prompt = `
You are branding a 4-frequency × 8-profile framework for a company.

Industry: ${input.industry || "General"}
Sector: ${input.sector || "General"}
Primary goal: ${input.primaryGoal || "Improve team performance"}
Brand tone: ${input.brandTone || "confident, modern, human"}

Return JSON with:
{
  "frequencies": {"A":"...", "B":"...", "C":"...", "D":"..."},
  "profiles": [{"name":"...", "frequency":"A"|"B"|"C"|"D"} x 8 in A..D pairs],
  "imagePrompts": {"A":"...", "B":"...", "C":"...", "D":"..."}
}
Keep names concise (1–3 words).
`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const text = resp.choices?.[0]?.message?.content ?? "";
    const parsed = tryParseJSON(text);

    const fallback = {
      frequencies: { A: "Pioneers", B: "Collaborators", C: "Operators", D: "Analysts" },
      profiles: [
        { name: "Catalyst", frequency: "A" },
        { name: "Visionary", frequency: "A" },
        { name: "People Connector", frequency: "B" },
        { name: "Culture Builder", frequency: "B" },
        { name: "Process Coordinator", frequency: "C" },
        { name: "System Planner", frequency: "C" },
        { name: "Quality Controller", frequency: "D" },
        { name: "Risk Optimiser", frequency: "D" },
      ],
      imagePrompts: {
        A: "bold abstract icon with motion and light trails",
        B: "warm collaborative symbol with interlocking shapes",
        C: "precise geometric system diagram motif",
        D: "analytical emblem with facets and structure",
      },
    };

    return {
      frequencies: (parsed?.frequencies as any) || fallback.frequencies,
      profiles: (parsed?.profiles as any) || fallback.profiles,
      imagePrompts: (parsed?.imagePrompts as any) || fallback.imagePrompts,
    };
  } catch {
    return {
      frequencies: { A: "Pioneers", B: "Collaborators", C: "Operators", D: "Analysts" },
      profiles: [
        { name: "Catalyst", frequency: "A" },
        { name: "Visionary", frequency: "A" },
        { name: "People Connector", frequency: "B" },
        { name: "Culture Builder", frequency: "B" },
        { name: "Process Coordinator", frequency: "C" },
        { name: "System Planner", frequency: "C" },
        { name: "Quality Controller", frequency: "D" },
        { name: "Risk Optimiser", frequency: "D" },
      ],
      imagePrompts: {
        A: "bold abstract icon with motion and light trails",
        B: "warm collaborative symbol with interlocking shapes",
        C: "precise geometric system diagram motif",
        D: "analytical emblem with facets and structure",
      },
    };
  }
}

/** Short copy for a profile card (summary + 3 strengths). */
export async function buildProfileCopy(input: {
  brandTone: string;
  industry: string;
  sector: string;
  company: string;
  frequencyName: string;
  profileName: string;
}) {
  const prompt = `
Write concise copy in the tone "${input.brandTone}" for a profile card.

Company: ${input.company}
Industry/Sector: ${input.industry}/${input.sector}
Frequency: ${input.frequencyName}
Profile: ${input.profileName}

Return JSON:
{"summary":"1 sentence", "strengths":["...","...","..."]}
`;
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });
    const parsed = tryParseJSON(resp.choices?.[0]?.message?.content ?? "");
    return {
      summary: parsed?.summary || "Concise positioning statement for this profile.",
      strengths: parsed?.strengths || ["Strength 1", "Strength 2", "Strength 3"],
    };
  } catch {
    return {
      summary: "Concise positioning statement for this profile.",
      strengths: ["Strength 1", "Strength 2", "Strength 3"],
    };
  }
}

/** Generate an image URL with OpenAI; fallback to a placeholder gradient. */
export async function generateImageURL(prompt: string): Promise<string> {
  try {
    const resp = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "512x512",
    });

    const arr = resp?.data ?? [];
    const first = Array.isArray(arr) ? arr[0] : undefined;
    const b64 = first && "b64_json" in first ? (first as any).b64_json as string | undefined : undefined;
    if (!b64) throw new Error("no-image");
    return `data:image/png;base64,${b64}`;
  } catch {
    // placeholder: subtle gradient SVG data URL
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='#2d8fc4'/><stop offset='1' stop-color='#64bae2'/></linearGradient></defs><rect fill='url(#g)' width='512' height='512'/></svg>`;
    const base64 = (typeof Buffer !== "undefined"
      ? Buffer.from(svg).toString("base64")
      : btoa(unescape(encodeURIComponent(svg))));
    return `data:image/svg+xml;base64,${base64}`;
  }
}

/* ------------ helpers ------------ */

function tryParseJSON(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
