// apps/web/lib/qsc-scoring.ts

// Basic types that match what we care about from the DB
export type QscProfileMapEntry = {
  points: number;
  profile: string; // e.g. "QSC_PERSONALITY_FIRE" or "QSC_MINDSET_VECTOR"
};

export type QscQuestion = {
  id: string;
  idx: number | null;
  profile_map: QscProfileMapEntry[] | null;
};

export type QscAnswer = {
  question_id: string;
  choice: number; // index into options/profile_map array (0-based)
};

export type QscLayerTotals = Record<string, number>;
export type QscLayerPercentages = Record<string, number>;

export type QscScoringResult = {
  // Raw point totals
  personalityTotals: QscLayerTotals;
  mindsetTotals: QscLayerTotals;

  // Percentages within each layer
  personalityPercentages: QscLayerPercentages;
  mindsetPercentages: QscLayerPercentages;

  // Primary + secondary labels
  primaryPersonality: string | null;
  secondaryPersonality: string | null;
  primaryMindset: string | null;
  secondaryMindset: string | null;

  // Combined code we can use to look up portal.qsc_profiles
  // e.g. FIRE + VECTOR => "FIRE_VECTOR"
  combinedProfileCode: string | null;
};

/**
 * Utility: normalises profile keys from "QSC_PERSONALITY_FIRE" => "FIRE"
 */
function extractKey(raw: string): { layer: "personality" | "mindset" | null; key: string } {
  if (raw.startsWith("QSC_PERSONALITY_")) {
    return { layer: "personality", key: raw.replace("QSC_PERSONALITY_", "") };
  }
  if (raw.startsWith("QSC_MINDSET_")) {
    return { layer: "mindset", key: raw.replace("QSC_MINDSET_", "") };
  }
  return { layer: null, key: raw };
}

/**
 * Utility: turn totals into percentages.
 */
function toPercentages(totals: QscLayerTotals): QscLayerPercentages {
  const result: QscLayerPercentages = {};
  const totalPoints = Object.values(totals).reduce((sum, v) => sum + v, 0);

  if (totalPoints <= 0) {
    return result;
  }

  for (const [key, value] of Object.entries(totals)) {
    result[key] = +( (value / totalPoints) * 100 ).toFixed(1);
  }

  return result;
}

/**
 * Utility: find primary and secondary keys based on totals.
 */
function findPrimaryAndSecondary(totals: QscLayerTotals): {
  primary: string | null;
  secondary: string | null;
} {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);

  if (entries.length === 0) {
    return { primary: null, secondary: null };
  }

  entries.sort((a, b) => b[1] - a[1]); // highest first

  const primary = entries[0]?.[0] ?? null;
  const secondary = entries[1]?.[0] ?? null;

  return { primary, secondary };
}

/**
 * Core scoring function for the Quantum Source Code test.
 *
 * It expects:
 * - All questions for the QSC test, including profile_map for each option.
 * - All answers for a single test taker (question_id + choice index).
 *
 * It returns:
 * - Total and percentage scores for Personality and Mindset layers.
 * - Primary + secondary labels.
 * - A combinedProfileCode (e.g. "FIRE_VECTOR") that we can join to portal.qsc_profiles.
 */
export function calculateQscScores(
  questions: QscQuestion[],
  answers: QscAnswer[]
): QscScoringResult {
  const personalityTotals: QscLayerTotals = {};
  const mindsetTotals: QscLayerTotals = {};

  // Index questions by id for quick lookup
  const questionsById = new Map<string, QscQuestion>();
  for (const q of questions) {
    questionsById.set(q.id, q);
  }

  // Walk through each answer, look up the corresponding profile_map entry
  for (const answer of answers) {
    const question = questionsById.get(answer.question_id);
    if (!question || !question.profile_map || !Array.isArray(question.profile_map)) {
      continue;
    }

    const mapEntry = question.profile_map[answer.choice];
    if (!mapEntry) continue;

    const { points, profile } = mapEntry;
    if (typeof points !== "number" || !profile) continue;

    const { layer, key } = extractKey(profile);

    if (layer === "personality") {
      personalityTotals[key] = (personalityTotals[key] ?? 0) + points;
    } else if (layer === "mindset") {
      mindsetTotals[key] = (mindsetTotals[key] ?? 0) + points;
    }
  }

  const personalityPercentages = toPercentages(personalityTotals);
  const mindsetPercentages = toPercentages(mindsetTotals);

  const { primary: primaryPersonality, secondary: secondaryPersonality } =
    findPrimaryAndSecondary(personalityTotals);
  const { primary: primaryMindset, secondary: secondaryMindset } =
    findPrimaryAndSecondary(mindsetTotals);

  let combinedProfileCode: string | null = null;
  if (primaryPersonality && primaryMindset) {
    combinedProfileCode = `${primaryPersonality}_${primaryMindset}`;
  }

  return {
    personalityTotals,
    mindsetTotals,
    personalityPercentages,
    mindsetPercentages,
    primaryPersonality,
    secondaryPersonality,
    primaryMindset,
    secondaryMindset,
    combinedProfileCode
  };
}
