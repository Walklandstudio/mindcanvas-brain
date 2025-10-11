// apps/web/app/_lib/ai.ts
import OpenAI from "openai";

type Plan = {
  frequencies: { A: string; B: string; C: string; D: string };
  profiles: { name: string; frequency: "A" | "B" | "C" | "D" }[];
  imagePrompts: { A: string; B: string; C: string; D: string };
};

function fallbackPlan(input: {
  industry?: string;
  sector?: string;
  brandTone?: string;
  primaryGoal?: string;
}): Plan {
  const ind = (input.industry || "Signature").trim();
  const goal = (input.primaryGoal || "Performance").trim();

  const freq = {
    A: `${ind} Pioneers`,
    B: `${ind} Collaborators`,
    C: `${ind} Operators`,
    D: `${ind} Analysts`,
  };

  const namesA = [`${goal} Catalyst`, `Visionary`];
  const namesB = [`People Connector`, `Culture Builder`];
  const namesC = [`Process Coordinator`, `System Planner`];
  const namesD = [`Quality Controller`, `Risk Optimiser`];

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

  const imagePrompts = {
    A: `Abstract emblem for bold innovators in ${ind}. Minimal, modern.`,
    B: `Abstract emblem for collaborative roles in ${ind}. Friendly, modern.`,
    C: `Abstract emblem for operations/process focus in ${ind}. Structured, modern.`,
    D: `Abstract emblem for analytical/quality focus in ${ind}. Precise, modern.`,
  };

  return { frequencies: freq, profiles, imagePrompts };
}

/**
 * Suggest frequency names + 8 profile names using onboarding context.
 * Falls back to deterministic names if OpenAI is unavailable or returns bad JSON.
 */
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
      "You are a brand-savvy naming assistant. Return concise JSON only. " +
      "Create 4 frequency names (A,B,C,D) and 8 profile names (two per frequency), " +
      "aligned with the client's industry and tone. Keep names 1–3 words.";

    const user = {
      industry: input.industry || "",
      sector: input.sector || "",
      tone: input.brandTone || "",
      primaryGoal: input.primaryGoal || "",
      need: "Frequencies A-D (names) + 8 profiles (name + frequency).",
    };

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content:
            "Return JSON as {frequencies:{A,B,C,D}, profiles:[{name,frequency}], imagePrompts:{A,B,C,D}} for prompts.",
        },
        { role: "user", content: JSON.stringify(user) },
      ],
      response_format: { type: "json_object" },
    });

    const content = resp.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    // Basic validation
    if (
      !parsed?.frequencies?.A ||
      !Array.isArray(parsed?.profiles) ||
      parsed.profiles.length < 8
    ) {
      return fallbackPlan(input);
    }

    // Ensure exactly 8 profiles (A–D × 2) and coerce frequencies
    const byF: Record<"A" | "B" | "C" | "D", string[]> = { A: [], B: [], C: [], D: [] };
    for (const p of parsed.profiles as any[]) {
      const f = String(p.frequency || "").toUpperCase();
      if (f === "A" || f === "B" || f === "C" || f === "D") {
        if (byF[f].length < 2) byF[f].push(String(p.name || "").trim() || "Profile");
      }
    }
    const fill = (arr: string[], fallbacks: string[]) =>
      arr.concat(fallbacks).slice(0, 2);

    const fb = fallbackPlan(input);
    const A = fill(byF.A, fb.profiles.filter((p) => p.frequency === "A").map((p) => p.name));
    const B = fill(byF.B, fb.profiles.filter((p) => p.frequency === "B").map((p) => p.name));
    const C = fill(byF.C, fb.profiles.filter((p) => p.frequency === "C").map((p) => p.name));
    const D = fill(byF.D, fb.profiles.filter((p) => p.frequency === "D").map((p) => p.name));

    const normalised: Plan = {
      frequencies: {
        A: String(parsed.frequencies?.A || fb.frequencies.A),
        B: String(parsed.frequencies?.B || fb.frequencies.B),
        C: String(parsed.frequencies?.C || fb.frequencies.C),
        D: String(parsed.frequencies?.D || fb.frequencies.D),
      },
      profiles: [
        { name: A[0], frequency: "A" },
        { name: A[1], frequency: "A" },
        { name: B[0], frequency: "B" },
        { name: B[1], frequency: "B" },
        { name: C[0], frequency: "C" },
        { name: C[1], frequency: "C" },
        { name: D[0], frequency: "D" },
        { name: D[1], frequency: "D" },
      ],
      imagePrompts: parsed.imagePrompts || fb.imagePrompts,
    };
    return normalised;
  } catch {
    return fallbackPlan(input);
  }
}
