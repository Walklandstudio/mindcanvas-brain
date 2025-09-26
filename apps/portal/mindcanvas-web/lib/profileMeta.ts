// lib/profileMeta.ts

export type ProfileKey = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";
export type FlowKey = "A" | "B" | "R" | "O"; // Catalyst, Communications, Rhythmic, Observer

// Long names for single flows (used in legends & badges)
export type FlowLabel =
  | "Catalyst Coaching Flow"
  | "Communications Coaching Flow"
  | "Rhythmic Coaching Flow"
  | "Observer Coaching Flow";

export const FLOW_LONG: Record<FlowKey, FlowLabel> = {
  A: "Catalyst Coaching Flow",
  B: "Communications Coaching Flow",
  R: "Rhythmic Coaching Flow",
  O: "Observer Coaching Flow",
};

// Full profile names (no abbreviations)
export const PROFILE_NAMES: Record<ProfileKey, string> = {
  P1: "The Innovator",
  P2: "The Storyteller",
  P3: "The Heart-Centred Coach",
  P4: "The Negotiator",
  P5: "The Grounded Guide",
  P6: "The Thinker",
  P7: "The Mastermind",
  P8: "The Change Agent",
};

// Your requested combined Coaching Flow label per profile
export const PROFILE_FLOW_DISPLAY: Record<ProfileKey, string> = {
  P1: "Catalyst Coaching Flow",
  P2: "Catalyst - Communications Coaching Flow",
  P3: "Communications Coaching Flow",
  P4: "Communications - Rhythmic Coaching Flow",
  P5: "Rhythmic Coaching Flow",
  P6: "Rhythmic - Observer Coaching Flow",
  P7: "Observer Coaching Flow",
  P8: "Catalyst - Observer Coaching Flow",
};

// Primary flow (single) for bucketing charts
export const PROFILE_PRIMARY_FLOW: Record<ProfileKey, FlowKey> = {
  P1: "A",
  P2: "A",
  P3: "B",
  P4: "B",
  P5: "R",
  P6: "R",
  P7: "O",
  P8: "A",
};

// === NEW: accept legacy short codes and map to P1…P8 ===
// (Covers earlier data like CA, GG, HC, MM, NG, TH, INN, INV; ST for Storyteller.)
const LEGACY_TO_P: Record<string, ProfileKey> = {
  CA: "P8",     // Change Agent
  GG: "P5",     // Grounded Guide
  HC: "P3",     // Heart-Centred Coach
  MM: "P7",     // Mastermind
  NG: "P4",     // Negotiator
  TH: "P6",     // Thinker
  INN: "P1",    // Innovator (variant)
  INV: "P1",    // Innovator (variant)
  ST: "P2",     // Storyteller (short)
  // add more aliases if you discover others
};

// Convert any incoming code/alias to a canonical ProfileKey
export function toProfileKey(code?: string | null): ProfileKey | undefined {
  if (!code) return undefined;
  const up = code.trim().toUpperCase();
  if ((["P1","P2","P3","P4","P5","P6","P7","P8"] as string[]).includes(up)) {
    return up as ProfileKey;
  }
  return LEGACY_TO_P[up];
}

// Back-compat: map profile -> primary FlowLabel
export const PROFILE_TO_FLOW: Record<ProfileKey, FlowLabel> = Object.fromEntries(
  (["P1","P2","P3","P4","P5","P6","P7","P8"] as ProfileKey[]).map((k) => [
    k,
    FLOW_LONG[PROFILE_PRIMARY_FLOW[k]],
  ])
) as Record<ProfileKey, FlowLabel>;

// Helpers used by the report & charts
export function profileNameFromCode(code?: string): string {
  const key = toProfileKey(code);
  return key ? PROFILE_NAMES[key] : (code ?? "");
}

export function flowLongNameFromKey(k?: string | null): string {
  if (!k) return "";
  const key = k.toUpperCase() as FlowKey;
  return FLOW_LONG[key] ?? "";
}

/** Choose the human flow label to show on the report */
export function flowLabelFrom(
  frequency: string | null | undefined,
  profileScores?: Record<string, number>,
  profileCode?: string | null
): string {
  const pk = toProfileKey(profileCode || undefined);
  if (pk) return PROFILE_FLOW_DISPLAY[pk];

  if (frequency) {
    const f = frequency.toUpperCase() as FlowKey;
    if (FLOW_LONG[f]) return FLOW_LONG[f];
  }

  if (profileScores && Object.keys(profileScores).length) {
    const best = Object.entries(profileScores)
      .map(([k, v]) => [toProfileKey(k), Number(v) || 0] as [ProfileKey | undefined, number])
      .filter(([k]) => !!k)
      .sort((a, b) => b[1] - a[1])[0];
    if (best && best[0]) return PROFILE_FLOW_DISPLAY[best[0]];
  }

  return "";
}

