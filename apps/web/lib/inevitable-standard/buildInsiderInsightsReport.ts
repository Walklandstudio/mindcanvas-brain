// apps/web/lib/inevitable-standard/buildInsiderInsightsReport.ts
//
// Pure selection + assembly for the approved five-section Insider Insights
// report. The Figma information architecture stays compact; the intelligence
// inside it follows the master-report evidence hierarchy:
//
//   pillar evidence -> Constraint Engine -> approach hypothesis -> secondary
//   influence -> live-conversation validation.
//
// The approach shapes interpretation. It never creates a risk signal or
// overrides stronger diagnostic evidence.

import {
  garFromRisk,
  getInsiderInsightsForApproach,
  INSIDER_INSIGHTS_SOURCE_VERSION,
  pillarIdFromKey,
  selectAccountability,
  selectAvoidedQuestion,
  selectChallengeSequenceForPillar,
  selectCoreProfile,
  selectDirectionalPair,
  selectNextStepPositioning,
  selectObjection,
  selectPillarState,
  selectPostSaleCoachingForPillar,
  selectPrimaryConstraint,
  selectQuestionsByPrimary,
  selectSecondaryInfluence,
  selectStrongestPillar,
  type InsiderApproachCode,
  type InsiderApproachName,
  type InsiderGar,
  type InsiderPillarKey,
  type InsiderPillarState,
  type InsiderRiskSignal,
} from "./content/insiderInsights";
import { getInevitableStandardQuestion } from "./questions";
import { RRE_TIMEFRAME_MONTHS } from "./revenueInStructure";

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

const PILLAR_KEYS: InsiderPillarKey[] = [
  "identity",
  "positioning",
  "offer",
  "sales",
  "revenue_model",
  "decision",
];

const PILLAR_LABEL: Record<InsiderPillarKey, string> = {
  identity: "Identity",
  positioning: "Positioning",
  offer: "Offer",
  sales: "Sales",
  revenue_model: "Revenue Model",
  decision: "Decision",
};

const PILLAR_DESCRIPTOR: Record<InsiderPillarKey, string> = {
  identity: "Authority, commercial confidence and willingness to lead.",
  positioning: "How clearly the market understands and chooses you.",
  offer: "The clarity, boundaries and repeatability of what you sell.",
  sales: "Discovery, conversion and the quality of the buying path.",
  revenue_model: "Margin, retention, owner reward and transferability.",
  decision: "Commercial focus, follow-through and decision discipline.",
};

const APPROACH_LABEL: Record<InsiderApproachCode, string> = {
  A: "Future-Led",
  B: "Connection-Led",
  C: "Timing-Led",
  D: "Evidence-Led",
};

const APPROACH_NAME_LABEL: Record<InsiderApproachName, string> = {
  FUTURE_LED: "Future-Led",
  CONNECTION_LED: "Connection-Led",
  TIMING_LED: "Timing-Led",
  EVIDENCE_LED: "Evidence-Led",
  BALANCED: "Balanced",
};

const APPROACH_NAME_BY_CODE: Record<InsiderApproachCode, InsiderApproachName> = {
  A: "FUTURE_LED",
  B: "CONNECTION_LED",
  C: "TIMING_LED",
  D: "EVIDENCE_LED",
};

const GAR_LABEL: Record<InsiderGar, string> = {
  GREEN: "Green",
  AMBER: "Amber",
  RED: "Red",
};

const FALSE_CONSTRAINT_LABEL: Record<string, string> = {
  lead_volume: "“Not enough leads”",
  price_too_high: "“The price is too high”",
  new_offer_needed: "“We need a new or bigger offer”",
  needs_systems: "“We need better systems first”",
};

const FALSE_CONSTRAINT_KEY: Record<
  string,
  "MORE_LEADS" | "PRICE_TOO_HIGH" | "NEW_OFFER" | "BETTER_SYSTEMS"
> = {
  lead_volume: "MORE_LEADS",
  price_too_high: "PRICE_TOO_HIGH",
  new_offer_needed: "NEW_OFFER",
  needs_systems: "BETTER_SYSTEMS",
};

const FALSE_CONSTRAINT_EVIDENCE: Record<string, InsiderPillarKey[]> = {
  lead_volume: ["positioning", "offer"],
  price_too_high: ["offer", "identity"],
  new_offer_needed: ["offer", "positioning"],
  needs_systems: ["revenue_model", "sales"],
};

/* -------------------------------------------------------------------------- */
/* Output types                                                                */
/* -------------------------------------------------------------------------- */

export type InsiderPillarSnapshot = {
  key: InsiderPillarKey;
  label: string;
  descriptor: string;
  percentage: number;
  gar: InsiderGar;
  garLabel: string;
};

export type InsiderSignalRow = {
  label: string;
  text: string;
};

export type InsiderTagKind =
  | "HYPOTHESIS TO VALIDATE"
  | "LISTEN FOR"
  | "DO NOT ASSUME"
  | "GREEN LEVERAGE";

export type InsiderTag = {
  kind: InsiderTagKind;
  text: string;
};

export type InsiderFounderWord = {
  questionNumber: 13 | 29;
  prompt: string;
  quote: string;
  pillar: {
    label: string;
    gar: InsiderGar;
    garLabel: string;
    percentage: number;
  } | null;
  evidencePillars: InsiderPillarSnapshot[];
  tags: InsiderTag[];
  riskSignal: {
    label: string;
    text: string;
    adviserResponse: string | null;
  } | null;
};

export type InsiderSequenceStep = {
  step: number;
  title: string;
  instruction: string;
  example: string | null;
};

export type InsiderCommercialContext = {
  timeframeMonths: number;
  currency: string;
  revenueBand: string | null;
  monthlyOpportunityBand: string | null;
  initialCustomerValueBand: string | null;
  twelveMonthPriority: string | null;
};

export type InsiderRevenueContext = {
  timeframeMonths: number;
  currency: string;
  rangeLow: number;
  rangeHigh: number;
  primaryConstraintLabel: string | null;
  confidenceLabel: string | null;
  customerValuesLow: number | null;
  customerValuesHigh: number | null;
  needsRevenueConfirmation: boolean;
  disclaimer: string | null;
};

export type InsiderInsightsReport = {
  meta: {
    approachCode: InsiderApproachCode;
    approachLabel: string;
    secondaryInfluence: InsiderApproachName | null;
    secondaryInfluenceLabel: string | null;
    primaryConstraint: {
      key: InsiderPillarKey;
      label: string;
    } | null;
    secondaryConstraint: {
      key: InsiderPillarKey;
      label: string;
    } | null;
    strongestPillar: {
      key: InsiderPillarKey;
      label: string;
      percentage: number;
    } | null;
    sourceVersion: string;
    generatedAt: string | null;
    taker: {
      fullName: string;
      email: string;
      company: string;
    };
    test: {
      name: string;
    };
    org: {
      name: string;
    };
  };

  snapshot: {
    readinessPercentage: number;
    readinessLabel: string | null;
    primaryApproach: {
      label: string;
      percentage: number;
    };
    secondaryApproach: {
      label: string;
      percentage: number | null;
    } | null;
    approachMix: Array<{
      code: InsiderApproachCode;
      label: string;
      percentage: number;
    }>;
    primaryConstraint: InsiderPillarSnapshot | null;
    secondaryConstraint: InsiderPillarSnapshot | null;
    strongestPillar: InsiderPillarSnapshot | null;
    falseConstraint: {
      label: string;
      note: string;
    } | null;
    priorityOrder: Array<{
      key: InsiderPillarKey;
      label: string;
    }>;
    pillars: InsiderPillarSnapshot[];
  };

  commercialContext: InsiderCommercialContext;
  revenueInStructure: InsiderRevenueContext | null;

  predictiveSignals: InsiderSignalRow[];
  foundersWords: InsiderFounderWord[];
  sequenceIntro: string | null;
  suggestedSequence: InsiderSequenceStep[];
  sequenceCaution: string | null;
  objective: string | null;
  qaFlags: string[];
};

/* -------------------------------------------------------------------------- */
/* Input normalisation                                                         */
/* -------------------------------------------------------------------------- */

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as LooseRecord)
    : {};
}

function clampPct(value: unknown): number {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function finiteNumberOrNull(value: unknown): number | null {
  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function isPillarKey(value: unknown): value is InsiderPillarKey {
  return (
    typeof value === "string" &&
    PILLAR_KEYS.includes(value as InsiderPillarKey)
  );
}

function isApproachCode(value: unknown): value is InsiderApproachCode {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionText(questionKey: string, value: unknown): string | null {
  const stableValue = cleanText(value);

  if (!stableValue) {
    return null;
  }

  const question = getInevitableStandardQuestion(questionKey);

  const option = question?.options.find(
    (item) => item.value === stableValue,
  );

  return cleanText(option?.text) || stableValue;
}

function optionHeadline(
  questionKey: string,
  value: unknown,
): string | null {
  const text = optionText(questionKey, value);

  if (!text) {
    return null;
  }

  const headline = text.split(/\s+-\s+/, 1)[0]?.trim();

  return headline || text;
}

function firstParagraph(value: unknown): string {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  return (text.split(/\n{2,}/)[0] ?? "").trim();
}

function firstSentence(value: unknown): string {
  const para = firstParagraph(value);

  if (!para) {
    return "";
  }

  const match = para.match(/^.*?[.?!](?=\s|$)/);

  return (match ? match[0] : para).trim();
}

function compact(value: unknown, max = 360): string {
  const para = firstParagraph(value)
    .replace(/\s+/g, " ")
    .trim();

  if (!para || para.length <= max) {
    return para;
  }

  const candidate = para.slice(0, max + 1);

  const lastSentence = Math.max(
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("? "),
    candidate.lastIndexOf("! "),
  );

  if (lastSentence >= Math.floor(max * 0.55)) {
    return candidate
      .slice(0, lastSentence + 1)
      .trim();
  }

  const lastSpace = candidate.lastIndexOf(" ");

  return `${candidate
    .slice(0, Math.max(lastSpace, max - 20))
    .trim()}…`;
}

function joinCompact(
  primary: unknown,
  nuance: unknown,
): string {
  const a = compact(primary, 270);
  const b = firstSentence(nuance);

  if (!a) {
    return compact(b);
  }

  if (!b || a.includes(b)) {
    return a;
  }

  return compact(`${a} ${b}`, 380);
}

const QUOTE_STOPLIST = new Set([
  "test",
  "testing",
  "tests",
  "na",
  "n/a",
  "none",
  "nothing",
  "asdf",
  "xxx",
  "todo",
  "tbd",
]);

function isMeaningfulFreeText(value: unknown): boolean {
  const text = cleanText(value);

  if (text.length < 5) {
    return false;
  }

  if (QUOTE_STOPLIST.has(text.toLowerCase())) {
    return false;
  }

  return /[a-z]{3,}/i.test(text);
}

function pickRiskSignal(
  signals: InsiderRiskSignal[],
  context: string,
): InsiderRiskSignal | null {
  const ctxTokens = new Set(
    context
      .toLowerCase()
      .match(/[a-z]{4,}/g) ?? [],
  );

  if (ctxTokens.size === 0) {
    return null;
  }

  let best: {
    signal: InsiderRiskSignal;
    score: number;
  } | null = null;

  for (const signal of signals) {
    const tokens =
      `${signal.label ?? ""} ${signal.text ?? ""}`
        .toLowerCase()
        .match(/[a-z]{4,}/g) ?? [];

    const score = tokens.filter(
      (token) => ctxTokens.has(token),
    ).length;

    if (!best || score > best.score) {
      best = {
        signal,
        score,
      };
    }
  }

  return best && best.score >= 3
    ? best.signal
    : null;
}

function toRiskSignalCard(
  signal: InsiderRiskSignal | null,
): InsiderFounderWord["riskSignal"] {
  if (!signal) {
    return null;
  }

  const text = cleanText(signal.text);

  if (!text) {
    return null;
  }

  return {
    label: cleanText(signal.label) || "Risk signal",
    text,
    adviserResponse:
      cleanText(signal.adviserResponse) || null,
  };
}

function evidenceStripKeys({
  ruleId,
  primary,
  secondary,
  pillars,
}: {
  ruleId: string | null;
  primary: InsiderPillarKey | null;
  secondary: InsiderPillarKey | null;
  pillars: InsiderPillarSnapshot[];
}): InsiderPillarKey[] {
  const keys: InsiderPillarKey[] = [];

  const add = (
    key: InsiderPillarKey | null | undefined,
  ) => {
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  };

  for (
    const key of ruleId
      ? FALSE_CONSTRAINT_EVIDENCE[ruleId] ?? []
      : []
  ) {
    add(key);
  }

  add(primary);
  add(secondary);

  for (
    const pillar of [...pillars].sort(
      (a, b) =>
        a.percentage - b.percentage ||
        PILLAR_KEYS.indexOf(a.key) -
          PILLAR_KEYS.indexOf(b.key),
    )
  ) {
    add(pillar.key);

    if (keys.length >= 4) {
      break;
    }
  }

  return keys.slice(0, 4);
}

export type BuildInsiderInsightsInput = {
  score: unknown;
  taker?: {
    fullName?: string | null;
    email?: string | null;
    company?: string | null;
  } | null;
  test?: {
    name?: string | null;
  } | null;
  org?: {
    name?: string | null;
  } | null;
  completedAt?: string | null;
};

/* -------------------------------------------------------------------------- */
/* Build                                                                       */
/* -------------------------------------------------------------------------- */

export function buildInsiderInsightsReport(
  input: BuildInsiderInsightsInput,
): InsiderInsightsReport | null {
  const score = asRecord(input.score);
  const approaches = asRecord(score.approaches);
  const constraints = asRecord(score.constraints);
  const overall = asRecord(score.overall);
  const pillarsRaw = asRecord(score.pillars);
  const contextAnswers = asRecord(
    score.context_answers,
  );
  const commercialRaw = asRecord(
    score.commercial_context,
  );
  const revenueRaw = asRecord(
    score.revenue_in_structure,
  );

  const qaFlags: string[] = [];

  /* --- approach ----------------------------------------------------------- */

  const percentages = asRecord(
    approaches.percentages,
  );

  let approachCode: InsiderApproachCode | null =
    isApproachCode(approaches.dominant)
      ? approaches.dominant
      : null;

  if (!approachCode) {
    let best: {
      code: InsiderApproachCode;
      pct: number;
    } | null = null;

    for (
      const code of [
        "A",
        "B",
        "C",
        "D",
      ] as InsiderApproachCode[]
    ) {
      const pct = Number(percentages[code]);

      if (
        Number.isFinite(pct) &&
        (!best || pct > best.pct)
      ) {
        best = {
          code,
          pct,
        };
      }
    }

    approachCode = best?.code ?? null;

    if (approachCode) {
      qaFlags.push(
        "approaches.dominant missing — inferred from percentages",
      );
    }
  }

  if (!approachCode) {
    return null;
  }

  const approachData =
    getInsiderInsightsForApproach(approachCode);

  if (!approachData) {
    return null;
  }

  const core = selectCoreProfile(approachCode);

  let secondaryInfluence:
    | InsiderApproachName
    | null = null;

  if (approaches.secondary === "BALANCED") {
    secondaryInfluence = "BALANCED";
  } else if (
    isApproachCode(approaches.secondary)
  ) {
    secondaryInfluence =
      APPROACH_NAME_BY_CODE[
        approaches.secondary
      ];
  }

  const secondaryProfile =
    secondaryInfluence
      ? selectSecondaryInfluence(
          approachCode,
          secondaryInfluence,
        )
      : null;

  /* --- pillar evidence ---------------------------------------------------- */

  const pillars: InsiderPillarSnapshot[] =
    PILLAR_KEYS.map((key) => {
      const result = asRecord(
        pillarsRaw[key],
      );

      const gar = garFromRisk(
        result.risk as string | undefined,
      );

      return {
        key,
        label: PILLAR_LABEL[key],
        descriptor:
          PILLAR_DESCRIPTOR[key],
        percentage: clampPct(
          result.percentage,
        ),
        gar,
        garLabel: GAR_LABEL[gar],
      };
    });

  const pillarByKey = new Map(
    pillars.map((pillar) => [
      pillar.key,
      pillar,
    ]),
  );

  /* --- constraint diagnosis --------------------------------------------- */

  const primaryKey:
    | InsiderPillarKey
    | null = isPillarKey(
    constraints.primary_constraint,
  )
    ? constraints.primary_constraint
    : null;

  const secondaryKey:
    | InsiderPillarKey
    | null = isPillarKey(
    constraints.secondary_constraint,
  )
    ? constraints.secondary_constraint
    : null;

  if (!primaryKey) {
    qaFlags.push(
      "constraints.primary_constraint missing — objection, sequence and objective fall back to approach content",
    );
  }

  const primaryPillar = primaryKey
    ? pillarByKey.get(primaryKey) ?? null
    : null;

  const secondaryPillar =
    secondaryKey
      ? pillarByKey.get(secondaryKey) ??
        null
      : null;

  const decisionPillar =
    pillarByKey.get("decision") ?? null;

  const strongest =
    [...pillars].sort(
      (a, b) =>
        b.percentage - a.percentage ||
        PILLAR_KEYS.indexOf(a.key) -
          PILLAR_KEYS.indexOf(b.key),
    )[0] ?? null;

  const priorityKeys:
    InsiderPillarKey[] = [];

  if (primaryKey) {
    priorityKeys.push(primaryKey);
  }

  if (
    secondaryKey &&
    secondaryKey !== primaryKey
  ) {
    priorityKeys.push(secondaryKey);
  }

  for (
    const pillar of [...pillars].sort(
      (a, b) =>
        a.percentage - b.percentage ||
        PILLAR_KEYS.indexOf(a.key) -
          PILLAR_KEYS.indexOf(b.key),
    )
  ) {
    if (
      !priorityKeys.includes(
        pillar.key,
      )
    ) {
      priorityKeys.push(pillar.key);
    }
  }

  const falseConstraintRuleId =
    typeof constraints.false_constraint_rule_id ===
    "string"
      ? constraints.false_constraint_rule_id
      : null;

  let falseConstraint: {
    label: string;
    note: string;
  } | null = null;

  if (
    falseConstraintRuleId &&
    FALSE_CONSTRAINT_LABEL[
      falseConstraintRuleId
    ]
  ) {
    const fcBlock =
      approachData.falseConstraints?.core?.[
        FALSE_CONSTRAINT_KEY[
          falseConstraintRuleId
        ]
      ] ?? null;

    const fcExplanation = cleanText(
      asRecord(
        constraints.false_constraint,
      ).explanation,
    );

    falseConstraint = {
      label:
        FALSE_CONSTRAINT_LABEL[
          falseConstraintRuleId
        ],
      note:
        cleanText(
          fcBlock?.diagnosticDirection,
        ) ||
        fcExplanation ||
        firstParagraph(fcBlock?.text),
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Commercial context — adviser-ready 12-month view                       */
  /* ---------------------------------------------------------------------- */

  const commercialCurrency =
    cleanText(commercialRaw.currency) ||
    cleanText(revenueRaw.currency) ||
    "USD";

  const commercialContext:
    InsiderCommercialContext = {
    timeframeMonths:
      RRE_TIMEFRAME_MONTHS,

    currency:
      commercialCurrency,

    revenueBand:
      optionHeadline(
        "c1",
        commercialRaw.revenue_band,
      ),

    monthlyOpportunityBand:
      optionHeadline(
        "c2",
        commercialRaw.monthly_opportunity_band,
      ),

    initialCustomerValueBand:
      optionHeadline(
        "c3",
        commercialRaw.initial_customer_value_band,
      ),

    twelveMonthPriority:
      optionText(
        "q26",
        contextAnswers[26],
      ),
  };

  const revenueTranslation = asRecord(
    revenueRaw.translation,
  );

  const revenueHasData =
    Object.keys(revenueRaw).length > 0 &&
    (
      revenueRaw.needs_revenue_confirmation ===
        true ||
      finiteNumberOrNull(
        revenueRaw.range_low,
      ) !== null ||
      finiteNumberOrNull(
        revenueRaw.range_high,
      ) !== null
    );

  const revenueInStructure:
    | InsiderRevenueContext
    | null = revenueHasData
    ? {
        timeframeMonths:
          finiteNumberOrNull(
            revenueRaw.timeframe_months,
          ) ??
          RRE_TIMEFRAME_MONTHS,

        currency:
          cleanText(
            revenueRaw.currency,
          ) ||
          commercialCurrency,

        rangeLow:
          finiteNumberOrNull(
            revenueRaw.range_low,
          ) ?? 0,

        rangeHigh:
          finiteNumberOrNull(
            revenueRaw.range_high,
          ) ?? 0,

        primaryConstraintLabel:
          isPillarKey(
            revenueRaw.primary_constraint_pillar,
          )
            ? PILLAR_LABEL[
                revenueRaw.primary_constraint_pillar
              ]
            : primaryKey
              ? PILLAR_LABEL[
                  primaryKey
                ]
              : null,

        confidenceLabel:
          cleanText(
            revenueRaw.confidence_label,
          ) ||
          cleanText(
            constraints.confidence,
          ) ||
          null,

        customerValuesLow:
          finiteNumberOrNull(
            revenueTranslation.customer_values_low,
          ),

        customerValuesHigh:
          finiteNumberOrNull(
            revenueTranslation.customer_values_high,
          ),

        needsRevenueConfirmation:
          revenueRaw.needs_revenue_confirmation ===
          true,

        disclaimer:
          cleanText(
            revenueRaw.disclaimer,
          ) || null,
      }
    : null;

  /* ---------------------------------------------------------------------- */
  /* Snapshot                                                                */
  /* ---------------------------------------------------------------------- */

  const snapshot:
    InsiderInsightsReport["snapshot"] = {
    readinessPercentage:
      clampPct(overall.percentage),

    readinessLabel:
      cleanText(overall.label) || null,

    primaryApproach: {
      label:
        APPROACH_LABEL[approachCode],
      percentage:
        clampPct(
          percentages[approachCode],
        ),
    },

    secondaryApproach:
      secondaryInfluence
        ? {
            label:
              APPROACH_NAME_LABEL[
                secondaryInfluence
              ],
            percentage:
              secondaryInfluence ===
                "BALANCED" ||
              !isApproachCode(
                approaches.secondary,
              )
                ? null
                : clampPct(
                    percentages[
                      approaches.secondary
                    ],
                  ),
          }
        : null,

    approachMix: (
      [
        "A",
        "B",
        "C",
        "D",
      ] as InsiderApproachCode[]
    ).map((code) => ({
      code,
      label: APPROACH_LABEL[code],
      percentage:
        clampPct(
          percentages[code],
        ),
    })),

    primaryConstraint:
      primaryPillar,

    secondaryConstraint:
      secondaryPillar,

    strongestPillar:
      strongest,

    falseConstraint,

    priorityOrder:
      priorityKeys.map((key) => ({
        key,
        label: PILLAR_LABEL[key],
      })),

    pillars,
  };

  /* --- selected evidence blocks ----------------------------------------- */

  const pc = primaryKey
    ? selectPrimaryConstraint(
        approachCode,
        primaryKey,
      )
    : null;

  const primaryState:
    | InsiderPillarState
    | null =
    primaryKey && primaryPillar
      ? selectPillarState(
          approachCode,
          primaryKey,
          primaryPillar.gar,
        )
      : null;

  const decisionState:
    | InsiderPillarState
    | null = decisionPillar
    ? selectPillarState(
        approachCode,
        "decision",
        decisionPillar.gar,
      )
    : null;

  const strongestBlurb =
    strongest
      ? selectStrongestPillar(
          approachCode,
          strongest.key,
        )
      : null;

  const directionalPair =
    primaryKey && secondaryKey
      ? selectDirectionalPair(
          approachCode,
          primaryKey,
          secondaryKey,
        )
      : null;

  const objection =
    primaryKey
      ? selectObjection(
          approachCode,
          primaryKey,
        )
      : null;

  const accountability =
    primaryKey && primaryPillar
      ? selectAccountability(
          approachCode,
          primaryKey,
          primaryPillar.gar,
        )
      : null;

  const challengeDetail =
    primaryKey
      ? selectChallengeSequenceForPillar(
          approachCode,
          primaryKey,
        )
      : null;

  const postSaleDetail =
    primaryKey
      ? selectPostSaleCoachingForPillar(
          approachCode,
          primaryKey,
        )
      : null;

  /* ====================================================================== */
  /* 2. PREDICTIVE SIGNALS                                                  */
  /* ====================================================================== */

  const predictiveSignals:
    InsiderSignalRow[] = [];

  const pushSignal = (
    label: string,
    value: string,
  ) => {
    const text = value.trim();

    if (text) {
      predictiveSignals.push({
        label,
        text,
      });
    } else {
      qaFlags.push(
        `predictive signal "${label}" has no source content — row omitted`,
      );
    }
  };

  pushSignal(
    "How they think",
    compact(
      primaryState?.howThisAffectsThinking,
    ) ||
      compact(core?.howTheyThink),
  );

  pushSignal(
    "How they decide",
    compact(
      decisionState?.howThisAffectsDeciding,
    ) ||
      compact(
        primaryState?.howThisAffectsDeciding,
      ) ||
      compact(core?.howTheyDecide),
  );

  pushSignal(
    "How they buy",
    compact(
      primaryState?.howThisAffectsBuying,
    ) ||
      compact(core?.howTheyBuy),
  );

  pushSignal(
    "What builds trust",
    compact(core?.trustBuilders),
  );

  pushSignal(
    "What reduces trust",
    compact(core?.trustReducers),
  );

  pushSignal(
    "Best communication style",
    compact(
      primaryState?.howToCommunicate,
    ) ||
      compact(
        core?.communicationStyle,
      ),
  );

  if (primaryKey) {
    pushSignal(
      "Likely objection",
      compact(
        objection?.possibleLanguage,
      ) ||
        compact(
          pc?.likelyBuyingObjectionTheme,
        ),
    );

    pushSignal(
      "What may really be underneath it",
      compact(
        pc?.whatIsReallyHappening,
      ) ||
        compact(
          directionalPair?.text,
        ) ||
        compact(
          objection?.whatMaySitUnderneath,
        ),
    );
  } else {
    qaFlags.push(
      "no primary constraint — Likely Objection / What May Really Be Underneath rows omitted",
    );
  }

  pushSignal(
    "Buying signals",
    compact(
      approachData
        .buyingResistance?.buying,
    ),
  );

  pushSignal(
    "Resistance signals",
    compact(
      approachData
        .buyingResistance?.resistance,
    ),
  );

  pushSignal(
    "What to challenge",
    compact(
      primaryState?.whatToChallenge,
    ) ||
      compact(challengeDetail) ||
      compact(
        core?.challengeGuidance,
      ),
  );

  pushSignal(
    "What not to assume",
    compact(
      primaryState?.whatNotToAssume,
    ) ||
      compact(
        core?.whatNotToAssumeGeneral,
      ),
  );

  pushSignal(
    "Coaching style",
    joinCompact(
      primaryState?.coachingImplication ||
        postSaleDetail ||
        accountability ||
        core?.coachingStyle,
      secondaryProfile?.coachingImplication,
    ),
  );

  /* ====================================================================== */
  /* 3. FOUNDER'S OWN WORDS                                                  */
  /* ====================================================================== */

  const q13present =
    isMeaningfulFreeText(
      contextAnswers[13],
    );

  const q29present =
    isMeaningfulFreeText(
      contextAnswers[29],
    );

  const foundersWords:
    InsiderFounderWord[] = [];

  const q13EvidenceKeys =
    evidenceStripKeys({
      ruleId:
        falseConstraintRuleId,
      primary:
        primaryKey,
      secondary:
        secondaryKey,
      pillars,
    });

  if (q13present) {
    const tags: InsiderTag[] = [];

    const hypothesis =
      cleanText(
        pc?.whatIsReallyHappening,
      ) ||
      cleanText(
        asRecord(
          constraints.false_constraint,
        ).explanation,
      ) ||
      cleanText(
        directionalPair?.text,
      );

    if (hypothesis) {
      tags.push({
        kind:
          "HYPOTHESIS TO VALIDATE",
        text:
          compact(
            hypothesis,
            440,
          ),
      });
    }

    if (
      primaryState?.whatToListenFor
    ) {
      tags.push({
        kind:
          "LISTEN FOR",
        text:
          compact(
            primaryState.whatToListenFor,
            440,
          ),
      });
    }

    if (
      primaryState?.whatNotToAssume
    ) {
      tags.push({
        kind:
          "DO NOT ASSUME",
        text:
          compact(
            primaryState.whatNotToAssume,
            440,
          ),
      });
    }

    if (
      strongest &&
      strongest.gar === "GREEN" &&
      strongestBlurb
    ) {
      tags.push({
        kind:
          "GREEN LEVERAGE",
        text:
          compact(
            strongestBlurb,
            440,
          ),
      });
    }

    foundersWords.push({
      questionNumber: 13,

      prompt:
        "The biggest thing holding the business back",

      quote:
        cleanText(
          contextAnswers[13],
        ),

      pillar:
        primaryPillar
          ? {
              label:
                primaryPillar.label,
              gar:
                primaryPillar.gar,
              garLabel:
                primaryPillar.garLabel,
              percentage:
                primaryPillar.percentage,
            }
          : null,

      evidencePillars:
        q13EvidenceKeys
          .map(
            (key) =>
              pillarByKey.get(key),
          )
          .filter(
            (
              pillar,
            ): pillar is InsiderPillarSnapshot =>
              Boolean(pillar),
          ),

      tags,

      riskSignal: null,
    });
  }

  if (q29present) {
    const riskContext =
      cleanText(
        contextAnswers[29],
      );

    const riskSignal =
      riskContext
        .split(/\s+/)
        .filter(Boolean).length >= 4
        ? toRiskSignalCard(
            pickRiskSignal(
              approachData.riskSignals ??
                [],
              riskContext,
            ),
          )
        : null;

    if (
      !riskSignal &&
      riskContext
        .split(/\s+/)
        .filter(Boolean).length < 4
    ) {
      qaFlags.push(
        "Q29 answer is too brief for an answer-level risk signal — risk card suppressed",
      );
    }

    foundersWords.push({
      questionNumber: 29,

      prompt:
        "A decision you know you need to make but have not made",

      quote:
        cleanText(
          contextAnswers[29],
        ),

      pillar:
        decisionPillar
          ? {
              label:
                decisionPillar.label,
              gar:
                decisionPillar.gar,
              garLabel:
                decisionPillar.garLabel,
              percentage:
                decisionPillar.percentage,
            }
          : null,

      evidencePillars: [],

      tags: [],

      riskSignal,
    });
  }

  if (
    foundersWords.length === 0
  ) {
    qaFlags.push(
      "Q13 / Q29 free text is empty or filler — Founder's Own Words section is empty",
    );
  }

  /* ====================================================================== */
  /* 4. SUGGESTED SEQUENCE                                                   */
  /* ====================================================================== */

  const prosper =
    approachData.prosper;

  const byPrimaryQuestions =
    primaryKey
      ? selectQuestionsByPrimary(
          approachCode,
          primaryKey,
        ) ?? []
      : [];

  const avoided =
    primaryKey
      ? selectAvoidedQuestion(
          approachCode,
          primaryKey,
        )
      : null;

  const nextStep =
    primaryKey
      ? selectNextStepPositioning(
          approachCode,
          primaryKey,
        )
      : null;

  const example = (
    index: number,
  ): string | null =>
    cleanText(
      byPrimaryQuestions[index],
    ) || null;

  const sequenceIntro =
    primaryKey
      ? [
          strongest
            ? `Lead with ${strongest.label} as evidence of what already works, then use ${PILLAR_LABEL[primaryKey]} as the contrast.`
            : `Lead with the evidence before introducing ${PILLAR_LABEL[primaryKey]}.`,

          firstSentence(
            secondaryProfile?.coachingImplication,
          ),
        ]
          .filter(Boolean)
          .join(" ")
      : firstSentence(
          prosper?.PERMISSION,
        ) || null;

  const suggestedSequence:
    InsiderSequenceStep[] = [
    {
      step: 1,

      title:
        "Open on the strength, not the constraint",

      instruction:
        compact(strongestBlurb) ||
        (strongest
          ? `${strongest.label} at ${strongest.percentage}% is the strongest evidence in the result. Use it to establish that the conversation is about protecting what works, not cataloguing deficits.`
          : firstSentence(
              prosper?.PERMISSION,
            )),

      example:
        strongest
          ? `What do you recognise in ${strongest.label} as something the business already does well?`
          : null,
    },

    {
      step: 2,

      title:
        "Let them describe the pattern in their own words",

      instruction:
        compact(
          prosper?.OWNERSHIP,
        ) ||
        compact(
          primaryState?.whatToListenFor,
        ) ||
        compact(
          prosper?.PERMISSION,
        ),

      example:
        example(0),
    },

    {
      step: 3,

      title:
        "Introduce the contrast, not the diagnosis",

      instruction:
        compact(
          directionalPair?.text,
        ) ||
        compact(
          falseConstraint?.note,
        ) ||
        compact(
          pc?.whatIsReallyHappening,
        ) ||
        compact(
          prosper?.REFRAME,
        ),

      example:
        example(1) ??
        (
          cleanText(
            avoided,
          ) || null
        ),
    },

    {
      step: 4,

      title:
        "Get one commitment, not a plan",

      instruction:
        compact(nextStep) ||
        compact(
          pc?.coachingPriority,
        ) ||
        compact(
          prosper?.RESULT,
        ),

      example:
        example(2),
    },
  ];

  const emptySteps =
    suggestedSequence
      .filter(
        (step) =>
          !step.instruction,
      )
      .map(
        (step) =>
          step.step,
      );

  if (emptySteps.length) {
    qaFlags.push(
      `suggested sequence step(s) ${emptySteps.join(", ")} have no selected source content`,
    );
  }

  const sequenceCaution =
    compact(
      primaryState?.whatNotToAssume,
    ) ||
    compact(
      core?.whatNotToAssumeGeneral,
    ) ||
    null;

  /* ====================================================================== */
  /* 5. THE OBJECTIVE                                                        */
  /* ====================================================================== */

  let objective:
    | string
    | null = null;

  if (
    pc?.conversationObjective
  ) {
    objective =
      cleanText(
        pc.conversationObjective,
      );
  } else if (
    pc?.coachingPriority
  ) {
    objective =
      firstSentence(
        pc.coachingPriority,
      );
  } else if (
    primaryKey
  ) {
    objective =
      `Get this ${APPROACH_LABEL[approachCode]} founder to name the ${PILLAR_LABEL[primaryKey]} constraint in their own words and leave with one specific next decision.`;

    qaFlags.push(
      "objective composed from fallback template — primary-constraint objective missing",
    );
  } else {
    objective =
      `Get this ${APPROACH_LABEL[approachCode]} founder to one diagnosed problem, one recommendation and one clean decision.`;

    qaFlags.push(
      "objective composed from fallback template — no primary constraint",
    );
  }

  return {
    meta: {
      approachCode,

      approachLabel:
        APPROACH_LABEL[
          approachCode
        ],

      secondaryInfluence,

      secondaryInfluenceLabel:
        secondaryInfluence
          ? APPROACH_NAME_LABEL[
              secondaryInfluence
            ]
          : null,

      primaryConstraint:
        primaryKey
          ? {
              key:
                primaryKey,
              label:
                PILLAR_LABEL[
                  primaryKey
                ],
            }
          : null,

      secondaryConstraint:
        secondaryKey
          ? {
              key:
                secondaryKey,
              label:
                PILLAR_LABEL[
                  secondaryKey
                ],
            }
          : null,

      strongestPillar:
        strongest
          ? {
              key:
                strongest.key,
              label:
                strongest.label,
              percentage:
                strongest.percentage,
            }
          : null,

      sourceVersion:
        INSIDER_INSIGHTS_SOURCE_VERSION,

      generatedAt:
        input.completedAt ??
        null,

      taker: {
        fullName:
          cleanText(
            input.taker?.fullName,
          ) ||
          "Unknown",

        email:
          cleanText(
            input.taker?.email,
          ),

        company:
          cleanText(
            input.taker?.company,
          ),
      },

      test: {
        name:
          cleanText(
            input.test?.name,
          ) ||
          "The Inevitable Standard",
      },

      org: {
        name:
          cleanText(
            input.org?.name,
          ),
      },
    },

    snapshot,

    commercialContext,

    revenueInStructure,

    predictiveSignals,

    foundersWords,

    sequenceIntro,

    suggestedSequence,

    sequenceCaution,

    objective,

    qaFlags,
  };
}

export {
  PILLAR_LABEL as INSIDER_PILLAR_LABEL,
  pillarIdFromKey,
};