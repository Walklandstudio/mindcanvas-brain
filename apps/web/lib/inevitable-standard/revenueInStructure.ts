import {
  INEVITABLE_STANDARD_PILLARS,
  type InevitableStandardPillar,
} from "./definition";
import type { InevitableStandardConstraintConfidence } from "./constraintEngine";
import type { InevitableStandardCommercialContext } from "./scoreInevitableStandard";

/**
 * Revenue in Your Structure (RRE) calculation for The Inevitable Standard
 * Diagnostic.
 *
 * Implements docs/inevitable-standard-spec.md section 4:
 *
 *   severity_factor = max(0, (80 - primary_constraint_pillar_%) / 80)
 *   point_estimate  = revenue_midpoint * opportunity_factor[pillar] * severity_factor
 *   range           = point_estimate * [0.8, 1.2]
 *
 * C2 (monthly opportunities) and C3 (typical deal size) do NOT affect the
 * estimate. C3 is used only to translate the dollar range into a relatable
 * "approximately N to M typical customer values" statement.
 *
 * This is a pure function: it performs no IO and makes no model calls.
 */

/* -------------------------------------------------------------------------- */
/* Bands (the stable option values from questions.ts C1 and C3).               */
/* -------------------------------------------------------------------------- */

export type InevitableStandardRevenueBand =
  | "under_100k"
  | "100k_250k"
  | "250k_500k"
  | "500k_1m"
  | "1m_2m"
  | "2m_5m"
  | "5m_10m"
  | "10m_plus";

export type InevitableStandardCustomerValueBand =
  | "under_1k"
  | "1k_5k"
  | "5k_15k"
  | "15k_50k"
  | "50k_100k"
  | "100k_plus";

/* -------------------------------------------------------------------------- */
/* Model constants - spec section 4. Judgement-based starting assumptions;     */
/* keep them here so they are easy to calibrate against real outcomes later.   */
/* -------------------------------------------------------------------------- */

/**
 * Revenue midpoint per C1 band. The 10m+ band is intentionally absent: the spec
 * says not to guess a midpoint for it - the caller supplies an approximate
 * figure through `approximate_revenue_override` instead.
 */
export const INEVITABLE_STANDARD_REVENUE_MIDPOINTS: Partial<
  Record<InevitableStandardRevenueBand, number>
> = {
  under_100k: 50_000,
  "100k_250k": 175_000,
  "250k_500k": 375_000,
  "500k_1m": 750_000,
  "1m_2m": 1_500_000,
  "2m_5m": 3_500_000,
  "5m_10m": 7_500_000,
};

/** Opportunity factor per Primary Constraint pillar. */
export const INEVITABLE_STANDARD_OPPORTUNITY_FACTORS: Record<
  InevitableStandardPillar,
  number
> = {
  sales: 0.3,
  revenue_model: 0.3,
  offer: 0.25,
  positioning: 0.2,
  identity: 0.15,
  decision: 0.15,
};

/**
 * Representative deal value per C3 band, used only for the customer-value
 * translation. The 100k+ band is open-ended; we treat 100000 as a floor rather
 * than requiring a separate override, because this figure only feeds a
 * relatability statement and never the estimate itself.
 */
export const INEVITABLE_STANDARD_DEAL_VALUE_MIDPOINTS: Record<
  InevitableStandardCustomerValueBand,
  number
> = {
  under_1k: 500,
  "1k_5k": 3_000,
  "5k_15k": 10_000,
  "15k_50k": 32_500,
  "50k_100k": 75_000,
  "100k_plus": 100_000,
};

/** Point at which the severity term reaches zero (spec: `80`). */
export const RRE_SEVERITY_CEILING_PCT = 80;

/** Display range width around the point estimate (spec: `±20%`). */
export const RRE_RANGE_LOW_MULTIPLIER = 0.8;
export const RRE_RANGE_HIGH_MULTIPLIER = 1.2;

/**
 * The translation is only shown when the upper end of the range is worth at
 * least this many typical customer values - below that it is not a useful
 * relatability statement.
 */
export const RRE_TRANSLATION_MIN_CUSTOMER_VALUES = 1;

/** Currency used when the submission carries none. */
export const RRE_DEFAULT_CURRENCY = "USD";

/** Fixed commercial timeframe used by C1 and the RRE model. */
export const RRE_TIMEFRAME_MONTHS = 12 as const;

/**
 * Standard disclaimer (Revenue Module section 6). Framing is deliberately
 * "scale and location of commercial value", never "lost" or "guaranteed".
 */
export const INEVITABLE_STANDARD_RRE_DISCLAIMER =
  "This figure is a modelled estimate based on the ranges you provided and the pattern in your diagnostic. It is not a reading of your accounts, a valuation, or a promise of results. Its purpose is to indicate the possible scale and location of commercial value associated with the current structure, so you know where to investigate first. General business information only, not financial, tax, legal or accounting advice.";

/** Prepended to the disclaimer when confidence is Directional. */
export const INEVITABLE_STANDARD_RRE_DIRECTIONAL_PREFIX =
  "This is a directional estimate only. ";

/* -------------------------------------------------------------------------- */
/* Contract.                                                                   */
/* -------------------------------------------------------------------------- */

export type InevitableStandardRevenueTranslation = {
  customer_values_low: number;
  customer_values_high: number;
};

export type InevitableStandardRevenueInStructureResult = {
  primary_constraint_pillar: InevitableStandardPillar;
  point_estimate: number;
  range_low: number;
  range_high: number;
  currency: string;
  timeframe_months: typeof RRE_TIMEFRAME_MONTHS;
  severity_factor: number;
  opportunity_factor: number;
  /** True whenever C1 is the 10m+ band (spec: figure should be confirmed). */
  needs_revenue_confirmation: boolean;
  translation: InevitableStandardRevenueTranslation | null;
  confidence_label: InevitableStandardConstraintConfidence;
  disclaimer: string;
};

export type InevitableStandardRevenueInStructureInput = {
  /** From the Constraint Engine result. */
  primary_constraint: InevitableStandardPillar;
  /** From the Constraint Engine result. */
  confidence: InevitableStandardConstraintConfidence;
  /**
   * The scored percentage of the primary constraint pillar, i.e.
   * `score.pillars[primary_constraint].percentage`.
   */
  primary_constraint_pillar_percentage: number;
  /** The submission's commercial context (C1/C2/C3 + currency), from mapSubmission. */
  commercial_context: InevitableStandardCommercialContext | null | undefined;
  /**
   * A specific revenue figure the caller has already collected. When supplied
   * and valid it is used as the midpoint directly, for any band - this is how
   * the 10m+ band produces a real estimate.
   */
  approximate_revenue_override?: number | null;
};

/* -------------------------------------------------------------------------- */
/* Helpers.                                                                    */
/* -------------------------------------------------------------------------- */

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function positiveNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

const roundCurrency = (value: number) => Math.round(value);
const roundFactor = (value: number) => Math.round(value * 10_000) / 10_000;
const roundHalf = (value: number) => Math.round(value * 2) / 2;

/**
 * Resolves the primary constraint pillar percentage. A non-finite value has no
 * signal, so we treat it as the severity ceiling (zero severity) rather than
 * risk overclaiming.
 */
function resolvePillarPercentage(value: number): number {
  if (!Number.isFinite(value)) return RRE_SEVERITY_CEILING_PCT;
  return Math.max(0, Math.min(100, value));
}

function resolveDealValueMidpoint(band: string | null): number | null {
  if (!band) return null;
  return (
    INEVITABLE_STANDARD_DEAL_VALUE_MIDPOINTS[
      band as InevitableStandardCustomerValueBand
    ] ?? null
  );
}

/* -------------------------------------------------------------------------- */
/* Calculation.                                                                */
/* -------------------------------------------------------------------------- */

export function calculateInevitableStandardRevenueInStructure(
  input: InevitableStandardRevenueInStructureInput,
): InevitableStandardRevenueInStructureResult {
  const commercialContext = input.commercial_context ?? {};

  const currency =
    cleanText(commercialContext.currency) ?? RRE_DEFAULT_CURRENCY;

  const revenueBand = cleanText(
    commercialContext.revenue_band,
  ) as InevitableStandardRevenueBand | null;
  const needsRevenueConfirmation = revenueBand === "10m_plus";

  // 1) Severity factor.
  const pillarPercentage = resolvePillarPercentage(
    input.primary_constraint_pillar_percentage,
  );
  const severityFactor = Math.max(
    0,
    (RRE_SEVERITY_CEILING_PCT - pillarPercentage) / RRE_SEVERITY_CEILING_PCT,
  );

  // 2) Opportunity factor.
  const opportunityFactor =
    INEVITABLE_STANDARD_OPPORTUNITY_FACTORS[input.primary_constraint] ?? 0;

  // 3) Revenue midpoint. A supplied override wins for any band; otherwise the
  //    band table is used. The 10m+ band has no table entry, so without an
  //    override it produces a safe zero estimate.
  const override = positiveNumberOrNull(input.approximate_revenue_override);
  const midpoint =
    override ??
    (revenueBand && revenueBand !== "10m_plus"
      ? INEVITABLE_STANDARD_REVENUE_MIDPOINTS[revenueBand] ?? null
      : null);

  // 4) Point estimate and display range.
  const rawPoint =
    midpoint !== null ? midpoint * opportunityFactor * severityFactor : 0;
  const rawRangeLow = rawPoint * RRE_RANGE_LOW_MULTIPLIER;
  const rawRangeHigh = rawPoint * RRE_RANGE_HIGH_MULTIPLIER;

  const pointEstimate = roundCurrency(rawPoint);
  const rangeLow = roundCurrency(rawRangeLow);
  const rangeHigh = roundCurrency(rawRangeHigh);

  // 5) Customer-value translation (C3 only, never affects the estimate).
  const dealValue = resolveDealValueMidpoint(
    cleanText(commercialContext.initial_customer_value_band),
  );

  let translation: InevitableStandardRevenueTranslation | null = null;
  if (dealValue !== null && dealValue > 0 && rawPoint > 0) {
    const highInCustomerValues = rawRangeHigh / dealValue;
    if (highInCustomerValues >= RRE_TRANSLATION_MIN_CUSTOMER_VALUES) {
      translation = {
        customer_values_low: roundHalf(rawRangeLow / dealValue),
        customer_values_high: roundHalf(highInCustomerValues),
      };
    }
  }

  // 6) Confidence-tuned disclaimer.
  const disclaimer =
    input.confidence === "Directional"
      ? `${INEVITABLE_STANDARD_RRE_DIRECTIONAL_PREFIX}${INEVITABLE_STANDARD_RRE_DISCLAIMER}`
      : INEVITABLE_STANDARD_RRE_DISCLAIMER;

  return {
    primary_constraint_pillar: input.primary_constraint,
    point_estimate: pointEstimate,
    range_low: rangeLow,
    range_high: rangeHigh,
    currency,
    timeframe_months: RRE_TIMEFRAME_MONTHS,
    severity_factor: roundFactor(severityFactor),
    opportunity_factor: roundFactor(opportunityFactor),
    needs_revenue_confirmation: needsRevenueConfirmation,
    translation,
    confidence_label: input.confidence,
    disclaimer,
  };
}

/* -------------------------------------------------------------------------- */
/* Model integrity check - mirrors the validators in the sibling modules.      */
/* -------------------------------------------------------------------------- */

export function validateInevitableStandardRevenueModel(): string[] {
  const issues: string[] = [];

  for (const pillar of INEVITABLE_STANDARD_PILLARS) {
    const factor = INEVITABLE_STANDARD_OPPORTUNITY_FACTORS[pillar];
    if (typeof factor !== "number" || factor <= 0 || factor > 1) {
      issues.push(
        `${pillar} must have an opportunity factor between 0 and 1.`,
      );
    }
  }

  const revenueBandOrder: InevitableStandardRevenueBand[] = [
    "under_100k",
    "100k_250k",
    "250k_500k",
    "500k_1m",
    "1m_2m",
    "2m_5m",
    "5m_10m",
  ];
  let previousMidpoint = 0;
  for (const band of revenueBandOrder) {
    const midpoint = INEVITABLE_STANDARD_REVENUE_MIDPOINTS[band];
    if (typeof midpoint !== "number" || midpoint <= previousMidpoint) {
      issues.push(
        `Revenue midpoint for ${band} must be a positive, ascending value.`,
      );
    } else {
      previousMidpoint = midpoint;
    }
  }
  if (INEVITABLE_STANDARD_REVENUE_MIDPOINTS["10m_plus"] !== undefined) {
    issues.push("The 10m+ band must not define a midpoint (spec: do not guess).");
  }

  const dealBandOrder: InevitableStandardCustomerValueBand[] = [
    "under_1k",
    "1k_5k",
    "5k_15k",
    "15k_50k",
    "50k_100k",
    "100k_plus",
  ];
  let previousDealValue = 0;
  for (const band of dealBandOrder) {
    const midpoint = INEVITABLE_STANDARD_DEAL_VALUE_MIDPOINTS[band];
    if (typeof midpoint !== "number" || midpoint <= previousDealValue) {
      issues.push(
        `Deal value midpoint for ${band} must be a positive, ascending value.`,
      );
    } else {
      previousDealValue = midpoint;
    }
  }

  if (
    !INEVITABLE_STANDARD_RRE_DISCLAIMER.includes(
      "not financial, tax, legal or accounting advice",
    )
  ) {
    issues.push("The disclaimer must carry the standard advice carve-out.");
  }
  if (/\b(lost|guarantee|guaranteed|definitely)\b/i.test(INEVITABLE_STANDARD_RRE_DISCLAIMER)) {
    issues.push("The disclaimer must not use loss-led or guarantee language.");
  }

  return issues;
}
