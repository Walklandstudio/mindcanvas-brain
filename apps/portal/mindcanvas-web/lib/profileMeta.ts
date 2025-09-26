// lib/profileMeta.ts

// ---- Flow labels (your canonical names) -----------------------------
export type FlowLabel =
  | "Catalyst Coaching Flow"
  | "Communications Coaching Flow"
  | "Rhythmic Coaching Flow"
  | "Observer Coaching Flow";

export const FLOW_LETTER_TO_LABEL: Record<string, FlowLabel> = {
  A: "Catalyst Coaching Flow",
  B: "Communications Coaching Flow",
  C: "Rhythmic Coaching Flow",
  D: "Observer Coaching Flow",
};

// ---- Profile code → Display name ------------------------------------
// Supports both your new P1..P8 codes and legacy short codes we’ve seen
// in your data (CA, GG, HC, NG, TH, MM, INN, ST).
export const CODE_TO_NAME: Record<string, string> = {
  // New canonical codes
  P1: "The Innovator",
  P2: "The Storyteller",
  P3: "The Heart-Centred Coach",
  P4: "The Negotiator",
  P5: "The Grounded Guide",
  P6: "The Thinker",
  P7: "The Mastermind",
  P8: "The Change Agent",

  // Legacy/alternate codes (kept for compatibility with existing results)
  INN: "The Innovator",
  ST: "The Storyteller",
  HC: "The Heart-Centred Coach",
  NG: "The Negotiator",
  GG: "The Grounded Guide",
  TH: "The Thinker",
  MM: "The Mastermind",
  CA: "The Change Agent",
};

// Helper: full name or fallback to the code
export function profileNameFromCode(code?: string | null): string {
  if (!code) return "—";
  return CODE_TO_NAME[code] ?? code;
}

// ---- Profile → Coaching Flow mapping --------------------------------
// Best-fit defaults (tweak if any profile maps to a different flow).
export const PROFILE_TO_FLOW: Record<string, FlowLabel> = {
  // Canonical P1..P8
  P1: "Catalyst Coaching Flow",        // Innovator
  P2: "Catalyst Coaching Flow",        // Storyteller (adjust if needed)
  P3: "Communications Coaching Flow",  // Heart-Centred Coach
  P4: "Communications Coaching Flow",  // Negotiator
  P5: "Rhythmic Coaching Flow",        // Grounded Guide
  P6: "Observer Coaching Flow",        // Thinker
  P7: "Observer Coaching Flow",        // Mastermind
  P8: "Observer Coaching Flow",        // Change Agent

  // Legacy codes → same flows
  INN: "Catalyst Coaching Flow",
  ST:  "Catalyst Coaching Flow",
  HC:  "Communications Coaching Flow",
  NG:  "Communications Coaching Flow",
  GG:  "Rhythmic Coaching Flow",
  TH:  "Observer Coaching Flow",
  MM:  "Observer Coaching Flow",
  CA:  "Observer Coaching Flow",
};

// Derive a flow label from letter code (A/B/C/D) or from profile scores.
export function flowLabelFrom(
  saved: string | null | undefined,
  profileScores?: Record<string, number>
): FlowLabel | "—" {
  // Map A/B/C/D first if present
  if (saved && FLOW_LETTER_TO_LABEL[saved]) return FLOW_LETTER_TO_LABEL[saved];

  // Otherwise derive from profileScores by summing mapped flows
  if (profileScores && Object.keys(profileScores).length > 0) {
    const sums: Record<FlowLabel, number> = {
      "Catalyst Coaching Flow": 0,
      "Communications Coaching Flow": 0,
      "Rhythmic Coaching Flow": 0,
      "Observer Coaching Flow": 0,
    };
    for (const [code, score] of Object.entries(profileScores)) {
      const flow = PROFILE_TO_FLOW[code];
      if (flow) sums[flow] = (sums[flow] ?? 0) + (Number(score) || 0);
    }
    let best: FlowLabel | null = null;
    let val = -Infinity;
    for (const [k, v] of Object.entries(sums)) {
      if (v > val) { val = v; best = k as FlowLabel; }
    }
    if (best) return best;
  }
  return "—";
}
