import { describe, expect, it } from "vitest";

import type { InevitableStandardPillar } from "./definition";
import type { InevitableStandardCommercialContext } from "./scoreInevitableStandard";
import {
  INEVITABLE_STANDARD_RRE_DIRECTIONAL_PREFIX,
  INEVITABLE_STANDARD_RRE_DISCLAIMER,
  RRE_DEFAULT_CURRENCY,
  calculateInevitableStandardRevenueInStructure,
  validateInevitableStandardRevenueModel,
  type InevitableStandardRevenueInStructureInput,
} from "./revenueInStructure";

function commercialContext(
  overrides: Partial<InevitableStandardCommercialContext> = {},
): InevitableStandardCommercialContext {
  return {
    revenue_band: "100k_250k",
    monthly_opportunity_band: "3_5",
    initial_customer_value_band: "1k_5k",
    currency: "USD",
    ...overrides,
  };
}

function calc(
  overrides: Partial<InevitableStandardRevenueInStructureInput> = {},
) {
  return calculateInevitableStandardRevenueInStructure({
    primary_constraint: "sales",
    confidence: "High",
    primary_constraint_pillar_percentage: 40,
    commercial_context: commercialContext(),
    ...overrides,
  });
}

describe("The Inevitable Standard revenue model", () => {
  it("passes the model integrity checks", () => {
    expect(validateInevitableStandardRevenueModel()).toEqual([]);
  });
});

describe("calculateInevitableStandardRevenueInStructure", () => {
  it("carries the fixed 12-month commercial timeframe", () => {
    expect(calc().timeframe_months).toBe(12);
  });

  it("applies the correct opportunity factor for each primary constraint pillar", () => {
    // Under 100k midpoint = 50000, primary pillar at 40% => severity 0.5.
    const cases: Array<[InevitableStandardPillar, number, number]> = [
      ["sales", 0.3, 7_500],
      ["revenue_model", 0.3, 7_500],
      ["offer", 0.25, 6_250],
      ["positioning", 0.2, 5_000],
      ["identity", 0.15, 3_750],
      ["decision", 0.15, 3_750],
    ];

    for (const [pillar, factor, expected] of cases) {
      const result = calc({
        primary_constraint: pillar,
        primary_constraint_pillar_percentage: 40,
        commercial_context: commercialContext({ revenue_band: "under_100k" }),
      });

      expect(result.primary_constraint_pillar).toBe(pillar);
      expect(result.opportunity_factor).toBe(factor);
      expect(result.severity_factor).toBe(0.5);
      expect(result.point_estimate).toBe(expected);
      expect(result.range_low).toBe(Math.round(expected * 0.8));
      expect(result.range_high).toBe(Math.round(expected * 1.2));
      expect(result.needs_revenue_confirmation).toBe(false);
    }
  });

  it("computes the severity factor from the primary pillar percentage", () => {
    expect(calc({ primary_constraint_pillar_percentage: 0 }).severity_factor).toBe(1);
    expect(calc({ primary_constraint_pillar_percentage: 20 }).severity_factor).toBe(0.75);
    expect(calc({ primary_constraint_pillar_percentage: 60 }).severity_factor).toBe(0.25);
  });

  it("floors the severity factor at zero when the primary pillar is at or above 80%", () => {
    const atCeiling = calc({ primary_constraint_pillar_percentage: 80 });
    expect(atCeiling.severity_factor).toBe(0);
    expect(atCeiling.point_estimate).toBe(0);
    expect(atCeiling.range_low).toBe(0);
    expect(atCeiling.range_high).toBe(0);
    expect(atCeiling.translation).toBeNull();

    expect(calc({ primary_constraint_pillar_percentage: 95 }).severity_factor).toBe(0);
  });

  it("returns a safe zero estimate for the 10m+ band without an override", () => {
    const result = calc({
      commercial_context: commercialContext({ revenue_band: "10m_plus" }),
    });

    expect(result.needs_revenue_confirmation).toBe(true);
    expect(result.point_estimate).toBe(0);
    expect(result.range_low).toBe(0);
    expect(result.range_high).toBe(0);
    expect(result.translation).toBeNull();
    // Factors are still reported so the caller can explain the model.
    expect(result.opportunity_factor).toBe(0.3);
    expect(result.severity_factor).toBe(0.5);
  });

  it("uses approximate_revenue_override as the midpoint for the 10m+ band", () => {
    const result = calc({
      commercial_context: commercialContext({
        revenue_band: "10m_plus",
        initial_customer_value_band: null,
      }),
      approximate_revenue_override: 20_000_000,
    });

    expect(result.needs_revenue_confirmation).toBe(true);
    // 20,000,000 * 0.3 * 0.5 = 3,000,000
    expect(result.point_estimate).toBe(3_000_000);
    expect(result.range_low).toBe(2_400_000);
    expect(result.range_high).toBe(3_600_000);
  });

  it("translates the range into typical customer values from the C3 band", () => {
    const result = calc({
      commercial_context: commercialContext({
        revenue_band: "250k_500k", // midpoint 375000
        initial_customer_value_band: "5k_15k", // deal value 10000
      }),
    });

    // 375000 * 0.3 * 0.5 = 56250 ; range 45000 - 67500
    expect(result.point_estimate).toBe(56_250);
    expect(result.range_low).toBe(45_000);
    expect(result.range_high).toBe(67_500);
    // 45000/10000 = 4.5 ; 67500/10000 = 6.75 -> nearest 0.5 -> 7
    expect(result.translation).toEqual({
      customer_values_low: 4.5,
      customer_values_high: 7,
    });
  });

  it("omits the translation when C3 does not support a sensible one", () => {
    // No C3 band at all.
    expect(
      calc({
        commercial_context: commercialContext({
          revenue_band: "under_100k",
          initial_customer_value_band: null,
        }),
      }).translation,
    ).toBeNull();

    // C3 present, but the deal value dwarfs the whole range (< 1 customer value).
    const dwarfed = calc({
      primary_constraint: "identity", // factor 0.15
      primary_constraint_pillar_percentage: 60, // severity 0.25
      commercial_context: commercialContext({
        revenue_band: "under_100k", // 50000
        initial_customer_value_band: "100k_plus", // deal value 100000
      }),
    });
    // 50000 * 0.15 * 0.25 = 1875 ; range high 2250 ; 2250 / 100000 << 1
    expect(dwarfed.point_estimate).toBe(1_875);
    expect(dwarfed.translation).toBeNull();
  });

  it("tunes the disclaimer to the confidence level", () => {
    expect(calc({ confidence: "High" }).disclaimer).toBe(
      INEVITABLE_STANDARD_RRE_DISCLAIMER,
    );
    expect(calc({ confidence: "High" }).confidence_label).toBe("High");

    expect(calc({ confidence: "Medium" }).disclaimer).toBe(
      INEVITABLE_STANDARD_RRE_DISCLAIMER,
    );

    const directional = calc({ confidence: "Directional" });
    expect(directional.disclaimer).toBe(
      `${INEVITABLE_STANDARD_RRE_DIRECTIONAL_PREFIX}${INEVITABLE_STANDARD_RRE_DISCLAIMER}`,
    );
    expect(directional.disclaimer.startsWith("This is a directional estimate only."))
      .toBe(true);
    expect(directional.confidence_label).toBe("Directional");

    // Never loss-led or guarantee framing.
    expect(calc().disclaimer).not.toMatch(/\b(lost|guarantee|guaranteed|definitely)\b/i);
  });

  it("passes currency through and defaults when it is missing", () => {
    expect(
      calc({ commercial_context: commercialContext({ currency: "ZAR" }) }).currency,
    ).toBe("ZAR");
    expect(
      calc({ commercial_context: commercialContext({ currency: "  GBP  " }) }).currency,
    ).toBe("GBP");
    expect(
      calc({ commercial_context: commercialContext({ currency: null }) }).currency,
    ).toBe(RRE_DEFAULT_CURRENCY);
    expect(calc({ commercial_context: null }).currency).toBe(RRE_DEFAULT_CURRENCY);
  });
});
