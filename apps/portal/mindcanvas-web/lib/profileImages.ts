// lib/profileImages.ts
export type ProfileKey =
  | "P1" | "P2" | "P3" | "P4"
  | "P5" | "P6" | "P7" | "P8";

export const PROFILE_TITLES: Record<ProfileKey, string> = {
  P1: "The Innovator",
  P2: "The Storyteller",
  P3: "The Heart-Centred Coach",
  P4: "The Negotiator",
  P5: "The Grounded Guide",
  P6: "The Thinker",
  P7: "The Mastermind",
  P8: "The Change Agent",
};

export const PROFILE_IMAGES: Record<ProfileKey, string> = {
  P1: "/profiles/P1.png",
  P2: "/profiles/P2.png",
  P3: "/profiles/P3.png",
  P4: "/profiles/P4.png",
  P5: "/profiles/P5.png",
  P6: "/profiles/P6.png",
  P7: "/profiles/P7.png",
  P8: "/profiles/P8.png",
};

// === FLOW LABELS & COLOURS ===
export type FlowLabel =
  | "Catalyst Coaching Flow"
  | "Communications Coaching Flow"
  | "Rhythmic Coaching Flow"
  | "Observer Coaching Flow";

export const FLOW_COLORS: Record<FlowLabel, string> = {
  "Catalyst Coaching Flow": "#2ecc2f",
  "Communications Coaching Flow": "#ea430e",
  "Rhythmic Coaching Flow": "#f3c90d",
  "Observer Coaching Flow": "#f3c90d", // as specified
};

// Primary flow per profile (for labelling/derived flow calc)
export const PROFILE_PRIMARY_FLOW: Record<ProfileKey, FlowLabel> = {
  P1: "Catalyst Coaching Flow",
  P2: "Catalyst Coaching Flow",          // Catalyst–Communications (primary = Catalyst)
  P3: "Communications Coaching Flow",
  P4: "Communications Coaching Flow",    // Communications–Rhythmic
  P5: "Rhythmic Coaching Flow",
  P6: "Rhythmic Coaching Flow",          // Rhythmic–Observer
  P7: "Observer Coaching Flow",
  P8: "Observer Coaching Flow",          // Catalyst–Observer (primary = Observer)
};

// Optional: split hybrids across two flows for pie calc (50/50 by default)
export const PROFILE_HYBRID_WEIGHTS: Partial<
  Record<
    ProfileKey,
    { a: FlowLabel; b: FlowLabel; wA: number; wB: number }
  >
> = {
  P2: { a: "Catalyst Coaching Flow", b: "Communications Coaching Flow", wA: 0.5, wB: 0.5 },
  P4: { a: "Communications Coaching Flow", b: "Rhythmic Coaching Flow", wA: 0.5, wB: 0.5 },
  P6: { a: "Rhythmic Coaching Flow", b: "Observer Coaching Flow", wA: 0.5, wB: 0.5 },
  P8: { a: "Observer Coaching Flow", b: "Catalyst Coaching Flow", wA: 0.5, wB: 0.5 },
};

// === PROFILE COLOURS (for the right card list/bars) ===
export const PROFILE_COLORS: Record<ProfileKey, string> = {
  P1: "#175f15",
  P2: "#2ecc2f",
  P3: "#ea430e",
  P4: "#f52905",
  P5: "#f3c90d",
  P6: "#f8ee18",
  P7: "#5d5d5d",
  P8: "#8a8583",
};
