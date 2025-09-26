// lib/profileMeta.ts
export type ProfileKey = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";
export type FlowKey = "A" | "B" | "R" | "O"; // Catalyst, Communications, Rhythmic, Observer

// Long names for single flows (used for legends, etc.)
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

// Your requested display label per profile (can be combined)
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

// Primary flow (single) for bucketing in charts and derivations
export const PROFILE_PRIMARY_FLOW: Record<ProfileKey, FlowKey> = {
  P1: "A", // Catalyst
  P2: "A", // Catalyst (primary), secondary Communications
  P3: "B", // Communications
  P4: "B", // Communications (primary), secondary Rhythmic
  P5: "R", // Rhythmic
  P6: "R", // Rhythmic (primary), secondary Observer
  P7: "O", // Observer
  P8: "A", // Catalyst (primary), secondary Observer
};

// Back-compat alias (some files import this):
// maps profile -> primary FlowLabel (single)
export const PROFILE_TO_FLOW: Record<ProfileKey, FlowLabel> = Object.fromEntries(
  (Object.keys(PROFILE_PRIMARY_FLOW) as ProfileKey[]).map((k) => [
    k,
    FLOW_LONG[PROFILE_PRIMARY_FLOW[k]],
  ])
) as Record<ProfileKey, FlowLabel>;

// === Helpers ===
export function profileNameFromCode(code?: string): string {
  if (!code) return "";
  const key = code.toUpperCase() as ProfileKey;
  return PROFILE_NAMES[key] ?? code;
}

export function flowLongNameFromKey(k?: string | null): string {
  if (!k) return "";
  const key = k.toUpperCase() as FlowKey;
  return FLOW_LONG[key] ?? "";
}

/**
 * Human label to show on the report:
 * 1) If profileCode is known, show that profile's combined display label.
 * 2) Otherwise if a frequency letter exists, show its long name.
 * 3) Otherwise derive dominant profile from scores and show that profile's display label.
 */
export function flowLabelFrom(
  frequency: string | null | undefined,
  profileScores?: Record<string, number>,
  profileCode?: string | null
): string {
  if (profileCode) {
    const key = profileCode.toUpperCase() as ProfileKey;
    if (PROFILE_FLOW_DISPLAY[key]) return PROFILE_FLOW_DISPLAY[key];
  }
  if (frequency) {
    const f = frequency.toUpperCase() as FlowKey;
    if (FLOW_LONG[f]) return FLOW_LONG[f];
  }
  if (profileScores && Object.keys(profileScores).length) {
    const best = Object.entries(profileScores)
      .map(([k, v]) => [k.toUpperCase(), Number(v) || 0] as [string, number])
      .filter(([k]) => k in PROFILE_FLOW_DISPLAY)
      .sort((a, b) => b[1] - a[1])[0];
    if (best) {
      const key = best[0] as ProfileKey;
      return PROFILE_FLOW_DISPLAY[key];
    }
  }
  return "";
}

