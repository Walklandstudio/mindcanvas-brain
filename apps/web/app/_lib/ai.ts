// apps/web/app/_lib/ai.ts
import OpenAI from "openai";

type Freq = "A" | "B" | "C" | "D";

export type Plan = {
  frequencies: Record<Freq, string>;
  profiles: { name: string; frequency: Freq }[];
  imagePrompts: Record<Freq, string>;
};

function fallbackPlan(input: { industry?: string; primaryGoal?: string }): Plan {
  const ind = (input.industry || "Signature").trim();
  const goal = (input.primaryGoal || "Performance").trim();

  const frequencies: Record<Freq, string> = {
    A: `${ind} Pioneers`,
    B: `${ind} Collaborators`,
    C: `${ind} Operators`,
    D: `${ind} Analysts`,
  };

  const profiles = [
    { name: `${goal} Catalyst`, frequency: "A" as const },
    { name: "Visionary",        frequency: "A" as const },
    { name: "People Connector", frequency: "B" as const },
    { name: "Culture Builder",  frequency: "B" as const },
    { name: "Process Coordinator", frequency: "C" as const },
    { name: "System Planner",      frequency: "C" as const },
    { name: "Quality Controller",  frequency: "D" as const },
    { name: "Risk Optimiser",      frequency: "D" as const },
  ];

  const imagePrompts: Record<Freq, string> = {
    A: `Abstract emblem for bold innovators in ${ind}. Minimal, modern.`,
    B: `Abstract emblem for collaborative roles in ${ind}. Friendly, modern.`,
    C: `Abstract emblem for operations/process focus in ${ind}. Structured, modern.`,
    D: `Abstract emblem for analytical/quality focus in ${ind}. Precise, modern.`,
  };

  return { frequencies, profiles, imagePrompts };
}

export async function suggestFrameworkNames(input: {
  industry?: string;
  sector?: string;
  brandTone?: string;
  primaryGoal?: string;
}): Promise<Plan> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return fallbackPlan(input);

  try {
    const openai = new OpenAI({ apiKey });
    const sys =
      "You are a naming assistant. Return concise JSON only. " +
      "Create 4 frequency names (A,B,C,D) and 8 profile names (two per frequency). Keep names 1–3 words.";
    const user = {
      industry: input.industry || "",
      sector: input.sector || "",
      tone: input.brandTone || "",
      primaryGoal: input.primaryGoal || "",
    };

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: "Return JSON {frequencies:{A,B,C,D}, profiles:[{name,frequency}], imagePrompts:{A,B,C,D}}." },
        { role: "user", content: JSON.stringify(user) },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(resp.choices?.[0]?.message?.content || "{}");
    const fb = fallbackPlan(input);

    // Validate and normalise
    const frequencies: Record<Freq, string> = {
      A: String(parsed?.frequencies?.A || fb.frequencies.A),
      B: String(parsed?.frequencies?.B || fb.frequencies.B),
      C: String(parsed?.frequencies?.C || fb.frequencies.C),
      D: String(parsed?.frequencies?.D || fb.frequencies.D),
    };

    const byF: Record<Freq, string[]> = { A: [], B: [], C: [], D: [] };
    for (const p of parsed?.profiles ?? []) {
      const f = String(p?.frequency || "").toUpperCase();
      if (["A", "B", "C", "D"].includes(f) && p?.name) {
        const ff = f as Freq;
        if (byF[ff].length < 2) byF[ff].push(String(p.name).trim());
      }
    }
    function take2(f: Freq, defaults: { name: string; frequency: Freq }[]) {
      const d = defaults.filter((x) => x.frequency === f).map((x) => x.name);
      return byF[f].concat(d).slice(0, 2);
    }
    const namesA = take2("A", fb.profiles);
    const namesB = take2("B", fb.profiles);
    const namesC = take2("C", fb.profiles);
    const namesD = take2("D", fb.profiles);

    const profiles = [
      { name: namesA[0], frequency: "A" as const },
      { name: namesA[1], frequency: "A" as const },
      { name: namesB[0], frequency: "B" as const },
      { name: namesB[1], frequency: "B" as const },
      { name: namesC[0], frequency: "C" as const },
      { name: namesC[1], frequency: "C" as const },
      { name: namesD[0], frequency: "D" as const },
      { name: namesD[1], frequency: "D" as const },
    ];

    const imagePrompts: Record<Freq, string> = parsed?.imagePrompts || fb.imagePrompts;
    return { frequencies, profiles, imagePrompts };
  } catch {
    return fallbackPlan(input);
  }
}

export async function buildProfileCopy(input: {
  brandTone?: string;
  industry?: string;
  sector?: string;
  company?: string;
  frequencyName: string;
  profileName: string;
}): Promise<{ summary: string; strengths: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const fallback = {
    summary: `${input.profileName} reflects ${input.frequencyName.toLowerCase()} tendencies suited to ${input.industry || "your industry"}.`,
    strengths: ["Takes initiative", "Works well with others", "Structured approach", "Quality-minded"],
  };
  if (!apiKey) return fallback;

  try {
    const openai = new OpenAI({ apiKey });
    const sys = `Write short, brand-safe copy. Tone: ${input.brandTone || "confident, modern"}.
Return JSON {summary, strengths[]} with 3–4 bullet strengths.`;
    const user = {
      company: input.company || "",
      industry: input.industry || "",
      sector: input.sector || "",
      frequencyName: input.frequencyName,
      profileName: input.profileName,
    };
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(user) },
      ],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(resp.choices?.[0]?.message?.content || "{}");
    if (!parsed?.summary || !Array.isArray(parsed?.strengths)) return fallback;
    return { summary: String(parsed.summary), strengths: parsed.strengths.slice(0, 4).map((s: any) => String(s)) };
  } catch {
    return fallback;
  }
}
