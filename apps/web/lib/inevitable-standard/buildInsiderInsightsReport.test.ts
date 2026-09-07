import { describe, expect, it } from "vitest";

import { buildInsiderInsightsReport } from "./buildInsiderInsightsReport";
import { selectPillarState } from "./content/insiderInsights";

function fakeScore(overrides: Record<string, unknown> = {}) {
  return {
    overall: { percentage: 41.5, label: "Inconsistent" },
    pillars: {
      identity: { percentage: 78, risk: "low_risk" },
      positioning: { percentage: 55, risk: "medium_risk" },
      offer: { percentage: 60, risk: "medium_risk" },
      sales: { percentage: 22, risk: "high_risk" },
      revenue_model: { percentage: 40, risk: "medium_risk" },
      decision: { percentage: 33, risk: "high_risk" },
    },
    approaches: {
      percentages: { A: 44, B: 20, C: 12, D: 24 },
      dominant: "A",
      secondary: "D",
    },
    constraints: {
      primary_constraint: "sales",
      secondary_constraint: "decision",
      false_constraint: null,
      false_constraint_rule_id: null,
      // Deliberately stale legacy order. Builder must not trust it.
      priority_fix_order: [
        "identity",
        "positioning",
        "offer",
        "revenue_model",
        "sales",
        "decision",
      ],
    },
    context_answers: {
      13: "We keep having great conversations that go nowhere. People love the vision but I never actually close.",
      29: "Whether to raise prices on the new package. I keep putting it off.",
    },
    ...overrides,
  };
}

describe("buildInsiderInsightsReport — approved five-section playbook", () => {
  it("keeps the approved five-section report contract", () => {
    const report = buildInsiderInsightsReport({ score: fakeScore() })!;
    expect(Object.keys(report).sort()).toEqual(
      [
        "commercialContext",
        "foundersWords",
        "meta",
        "objective",
        "predictiveSignals",
        "qaFlags",
        "revenueInStructure",
        "sequenceCaution",
        "sequenceIntro",
        "snapshot",
        "suggestedSequence",
      ].sort(),
    );
    expect(report).not.toHaveProperty("sections");
  });

  it("rebuilds Priority Fix Order from Primary + Secondary instead of stale stored order", () => {
    const { snapshot } = buildInsiderInsightsReport({ score: fakeScore() })!;
    expect(snapshot.priorityOrder.map((item) => item.label)).toEqual([
      "Sales",
      "Decision",
      "Revenue Model",
      "Positioning",
      "Offer",
      "Identity",
    ]);
  });

  it("snapshot carries the live constraint and strongest-pillar evidence", () => {
    const { snapshot, meta } = buildInsiderInsightsReport({
      score: fakeScore(),
    })!;
    expect(meta.approachLabel).toBe("Future-Led");
    expect(snapshot.primaryConstraint?.label).toBe("Sales");
    expect(snapshot.primaryConstraint?.gar).toBe("RED");
    expect(snapshot.secondaryConstraint?.label).toBe("Decision");
    expect(snapshot.strongestPillar?.label).toBe("Identity");
    expect(snapshot.pillars).toHaveLength(6);
  });

  it("renders a False Constraint only when the evidence rule matched", () => {
    expect(
      buildInsiderInsightsReport({ score: fakeScore() })!.snapshot
        .falseConstraint,
    ).toBeNull();

    const report = buildInsiderInsightsReport({
      score: fakeScore({
        constraints: {
          primary_constraint: "sales",
          secondary_constraint: "decision",
          false_constraint: {
            stated_pillar: "positioning",
            evidence_pillar: "sales",
            explanation: "The pattern points to Sales, not lead volume.",
          },
          false_constraint_rule_id: "lead_volume",
          priority_fix_order: ["identity", "positioning", "sales"],
        },
      }),
    })!;

    expect(report.snapshot.falseConstraint?.label.toLowerCase()).toContain(
      "leads",
    );
    expect(report.snapshot.falseConstraint?.note).toBeTruthy();
  });

  it("keeps all 13 Figma predictive-signal rows for every approach", () => {
    const expected = [
      "How they think",
      "How they decide",
      "How they buy",
      "What builds trust",
      "What reduces trust",
      "Best communication style",
      "Likely objection",
      "What may really be underneath it",
      "Buying signals",
      "Resistance signals",
      "What to challenge",
      "What not to assume",
      "Coaching style",
    ];

    for (const dominant of ["A", "B", "C", "D"]) {
      const report = buildInsiderInsightsReport({
        score: fakeScore({
          approaches: {
            percentages: { A: 40, B: 25, C: 20, D: 15 },
            dominant,
            secondary: dominant === "A" ? "D" : "A",
          },
        }),
      })!;
      expect(
        report.predictiveSignals.map((row) => row.label),
        dominant,
      ).toEqual(expected);
    }
  });

  it("uses actual Sales state before generic Connection-Led behaviour", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({
        approaches: {
          percentages: { A: 15, B: 55, C: 15, D: 15 },
          dominant: "B",
          secondary: "A",
        },
        pillars: {
          identity: { percentage: 78, risk: "low_risk" },
          positioning: { percentage: 71, risk: "low_risk" },
          offer: { percentage: 66, risk: "medium_risk" },
          sales: { percentage: 82, risk: "low_risk" },
          revenue_model: { percentage: 54, risk: "medium_risk" },
          decision: { percentage: 59, risk: "medium_risk" },
        },
        constraints: {
          primary_constraint: "sales",
          secondary_constraint: "decision",
          false_constraint: null,
          false_constraint_rule_id: null,
          priority_fix_order: [],
        },
      }),
    })!;

    const greenSales = selectPillarState("B", "sales", "GREEN")!;
    const row = report.predictiveSignals.find(
      (item) => item.label === "How they buy",
    )!;
    const evidenceLead = (greenSales.howThisAffectsBuying ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 45);
    expect(evidenceLead.length).toBeGreaterThan(15);
    expect(row.text).toContain(evidenceLead);
  });

  it("uses Red Sales evidence when the Sales result is Red", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({
        approaches: {
          percentages: { A: 15, B: 55, C: 15, D: 15 },
          dominant: "B",
          secondary: "A",
        },
      }),
    })!;

    const redSales = selectPillarState("B", "sales", "RED")!;
    const row = report.predictiveSignals.find(
      (item) => item.label === "How they buy",
    )!;
    const evidenceLead = (redSales.howThisAffectsBuying ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 45);
    expect(row.text).toContain(evidenceLead);
  });

  it("Q13 shows the Figma four-card evidence strip and all four adviser tags", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({
        constraints: {
          primary_constraint: "sales",
          secondary_constraint: "decision",
          false_constraint: {
            stated_pillar: "positioning",
            evidence_pillar: "sales",
            explanation: "Lead volume is not the first intervention.",
          },
          false_constraint_rule_id: "lead_volume",
          priority_fix_order: [],
        },
      }),
    })!;

    const q13 = report.foundersWords.find(
      (item) => item.questionNumber === 13,
    )!;
    expect(q13.evidencePillars.map((pillar) => pillar.key)).toEqual([
      "positioning",
      "offer",
      "sales",
      "decision",
    ]);
    expect(q13.tags.map((tag) => tag.kind)).toEqual(
      expect.arrayContaining([
        "HYPOTHESIS TO VALIDATE",
        "LISTEN FOR",
        "DO NOT ASSUME",
        "GREEN LEVERAGE",
      ]),
    );
    expect(q13.riskSignal).toBeNull();
  });

  it("Q29 is the answer-level risk surface, matching the approved Figma treatment", () => {
    const report = buildInsiderInsightsReport({ score: fakeScore() })!;
    const q29 = report.foundersWords.find(
      (item) => item.questionNumber === 29,
    )!;
    expect(q29.evidencePillars).toHaveLength(0);
    expect(q29.tags).toHaveLength(0);
  });

  it("does not infer a Q29 risk signal from a one-word answer or approach alone", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({
        context_answers: {
          13: "leads",
          29: "Sales",
        },
        approaches: {
          percentages: { A: 16.7, B: 41.7, C: 33.3, D: 8.3 },
          dominant: "B",
          secondary: "C",
        },
      }),
    })!;

    const q29 = report.foundersWords.find(
      (item) => item.questionNumber === 29,
    )!;
    expect(q29.riskSignal).toBeNull();
    expect(report.qaFlags.join(" ")).toContain("too brief");
  });

  it("does not label an Amber strongest pillar as GREEN LEVERAGE", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({
        pillars: {
          identity: { percentage: 41.7, risk: "medium_risk" },
          positioning: { percentage: 50, risk: "medium_risk" },
          offer: { percentage: 66.7, risk: "medium_risk" },
          sales: { percentage: 33.3, risk: "high_risk" },
          revenue_model: { percentage: 66.7, risk: "medium_risk" },
          decision: { percentage: 58.3, risk: "medium_risk" },
        },
        approaches: {
          percentages: { A: 16.7, B: 41.7, C: 33.3, D: 8.3 },
          dominant: "B",
          secondary: "C",
        },
        constraints: {
          primary_constraint: "sales",
          secondary_constraint: "identity",
          false_constraint: null,
          false_constraint_rule_id: null,
          priority_fix_order: [],
        },
        context_answers: {
          13: "leads",
          29: "Sales",
        },
      }),
    })!;

    const q13 = report.foundersWords.find(
      (item) => item.questionNumber === 13,
    )!;
    expect(q13.tags.map((tag) => tag.kind)).not.toContain("GREEN LEVERAGE");
    expect(report.snapshot.strongestPillar?.gar).toBe("AMBER");
  });

  it("filler free text does not create Founder Own Words evidence", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({ context_answers: { 13: "n/a", 29: "" } }),
    })!;
    expect(report.foundersWords).toHaveLength(0);
    expect(report.qaFlags.join(" ")).toContain("Founder's Own Words");
  });

  it("Suggested Sequence uses the four approved Figma moves", () => {
    const report = buildInsiderInsightsReport({ score: fakeScore() })!;
    expect(report.suggestedSequence.map((step) => step.title)).toEqual([
      "Open on the strength, not the constraint",
      "Let them describe the pattern in their own words",
      "Introduce the contrast, not the diagnosis",
      "Get one commitment, not a plan",
    ]);
    for (const step of report.suggestedSequence) {
      expect(step.instruction.length).toBeGreaterThan(0);
    }
    expect(report.sequenceIntro).toBeTruthy();
  });

  it("The Objective remains tailored to the Primary Constraint block", () => {
    const report = buildInsiderInsightsReport({ score: fakeScore() })!;
    expect(report.objective).toBeTruthy();
    expect(report.objective!.length).toBeGreaterThan(20);
  });

  it("degrades safely without a primary constraint", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({
        constraints: {
          primary_constraint: null,
          secondary_constraint: null,
          priority_fix_order: [],
        },
      }),
    })!;
    expect(report.predictiveSignals).toHaveLength(11);
    expect(report.suggestedSequence).toHaveLength(4);
    expect(report.objective).toBeTruthy();
    expect(report.qaFlags.join(" ")).toContain("primary constraint");
  });

  it("infers the approach from percentages when dominant is absent", () => {
    const report = buildInsiderInsightsReport({
      score: fakeScore({
        approaches: {
          percentages: { A: 10, B: 55, C: 20, D: 15 },
          secondary: "A",
        },
      }),
    })!;
    expect(report.meta.approachCode).toBe("B");
    expect(report.qaFlags.join(" ")).toContain("dominant");
  });

  it("returns null without a usable approach score", () => {
    expect(buildInsiderInsightsReport({ score: null })).toBeNull();
    expect(buildInsiderInsightsReport({ score: {} })).toBeNull();
  });

  it("never leaks source anchors or content IDs into rendered report strings", () => {
    const banned = [
      /SOURCE ANCHOR/i,
      /CONTENT ID:/i,
      /\bchapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d)/i,
      /\bappendix\s+[a-z]\b/i,
    ];

    for (const primary of [
      "identity",
      "sales",
      "revenue_model",
      "decision",
    ]) {
      for (const dominant of ["A", "B", "C", "D"]) {
        const report = buildInsiderInsightsReport({
          score: fakeScore({
            approaches: {
              percentages: { A: 40, B: 25, C: 20, D: 15 },
              dominant,
              secondary: "D",
            },
            constraints: {
              primary_constraint: primary,
              secondary_constraint:
                primary === "sales" ? "decision" : "sales",
              false_constraint_rule_id: "lead_volume",
              false_constraint: { explanation: "x" },
              priority_fix_order: [],
            },
          }),
        })!;

        const strings = [
          ...report.predictiveSignals.map((row) => row.text),
          ...report.foundersWords.flatMap((word) => [
            ...word.tags.map((tag) => tag.text),
            word.riskSignal?.text ?? "",
            word.riskSignal?.adviserResponse ?? "",
          ]),
          report.sequenceIntro ?? "",
          ...report.suggestedSequence.flatMap((step) => [
            step.instruction,
            step.example ?? "",
          ]),
          report.sequenceCaution ?? "",
          report.objective ?? "",
          report.snapshot.falseConstraint?.note ?? "",
        ];

        for (const value of strings) {
          for (const pattern of banned) {
            expect(value, `${dominant}/${primary}`).not.toMatch(pattern);
          }
        }
      }
    }
  });
});
