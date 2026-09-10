// apps/web/components/portal/create-test-link/types.ts
// Shared types, form shape, and static copy for the Create Test Link modal.

export type ModelOption = {
  id: string;
  name: string;
  category?: string;
  locked?: boolean;
  requiredTier?: 2 | 3;
  requiredPlan?: "Pro" | "Growth";
};

export type Experience = "show" | "hide" | "host" | "review";
export type LimitMode = "none" | "count" | "date";
export type ReportVariant = "lite" | "full";
export type ReportCurrency = "GBP" | "USD" | "EUR" | "ZAR";

// The link fields shared by the create wizard's advanced step and the
// edit-link modal, which renders the same controls as one flat form.
export type AdvancedLinkValues = {
  nextStepsUrl: string;
  redirectUrl: string;
  hiddenResultsMessage: string;
  contactOwner: string;
  emailReport: boolean;
  reportVariant: ReportVariant;
  reportPaywallEnabled: boolean;
  reportPrice: string;
  reportCurrency: ReportCurrency;
};

export type CreateTestLinkFormValues = AdvancedLinkValues & {
  modelId: string;
  name: string;
  experience: Experience;
  limitMode: LimitMode;
  maxUses: string;
  expiresDate: string;
};

export const EXPERIENCE_OPTIONS: {
  value: Experience;
  title: string;
  hint: string;
  showResults: boolean;
}[] = [
  {
    value: "show",
    title: "Show report after completion",
    hint: "Test taker sees their report immediately",
    showResults: true,
  },
  {
    value: "hide",
    title: "Hide report after completion",
    hint: "Report delivered to host only",
    showResults: false,
  },
  {
    value: "host",
    title: "Send report to host only",
    hint: "Host reviews and shares manually",
    showResults: false,
  },
  {
    value: "review",
    title: "Require manual review before sharing",
    hint: "You approve before test taker receives the report",
    showResults: false,
  },
];

export const LIMIT_OPTIONS: { value: LimitMode; title: string; hint: string }[] =
  [
    {
      value: "none",
      title: "No limit",
      hint: "Unlimited submissions on this link",
    },
    {
      value: "count",
      title: "Limit by number of submissions",
      hint: "Link closes when the limit is reached",
    },
    {
      value: "date",
      title: "Close on a specific date",
      hint: "Link deactivates automatically",
    },
  ];

// Whether the chosen experience shows the report to the test taker.
export function showsResults(experience: Experience): boolean {
  return (
    EXPERIENCE_OPTIONS.find((o) => o.value === experience)?.showResults ?? true
  );
}

// The lite report only exists for WhatsWhats Global's Visibility Ladder.
export function supportsLiteReport(
  orgSlug: string,
  testName?: string | null,
): boolean {
  return (
    orgSlug === "whatswhats-global" &&
    /visibility ladder/i.test(testName || "")
  );
}

export function reportPriceToCents(value: string): number | null {
  const normalized = value.trim().replace(/,/g, ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000) return null;
  return Math.round(amount * 100);
}

// Wizard step indexes — 5 input steps followed by the success screen.
export const STEP_MODEL = 0;
export const STEP_NAME = 1;
export const STEP_EXPERIENCE = 2;
export const STEP_LIMITS = 3;
export const STEP_ADVANCED = 4;
export const STEP_SUCCESS = 5;

// The last step that still collects input (submitting happens here).
export const LAST_INPUT_STEP = STEP_ADVANCED;

// 5 input steps + success.
export const TOTAL_STEPS = 6;
