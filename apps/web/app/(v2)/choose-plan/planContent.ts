//apps/web/app/(V2)/choose-plan/planContent.ts
export type PlanFeature = { label: string; included: boolean };

export type PlanCardContent = {
  tier: 1 | 2 | 3 | 4;
  name: string;
  tagline: string;
  badge?: { label: string; color: "blue" | "teal" };
  highlight?: boolean;
  cta: string;
  externalUrl?: string;
  fallbackAmountCents: number;
  features: PlanFeature[];
};

const inc = (label: string): PlanFeature => ({ label, included: true });
const exc = (label: string): PlanFeature => ({ label, included: false });

export const PLAN_CARDS: PlanCardContent[] = [
  {
    tier: 1,
    name: "Starter",
    tagline: "Independent consultants and coaches",
    cta: "Select Starter",
    fallbackAmountCents: 14700,
    features: [
      inc("1 Test Engine"),
      inc("Predictive Selling Engine"),
      inc("10 test submissions/month"),
      inc("10 kickstart free tests"),
      inc("Bulk tests: $297 for 20"),
      inc("1:1 onboarding call"),
      inc("Monthly group coaching"),
      inc("Training library"),
      inc("Standard Support Level"),
      exc("Monthly Sales Strategy"),
      exc("Customisation of IP"),
      exc("Revenue licensing"),
      exc("White Label Versions"),
      exc("Additional Revenue Through Licensing"),
      exc("API integrations"),
    ],
  },
  {
    tier: 2,
    name: "Pro",
    tagline: "Growing service businesses",
    badge: { label: "Most popular", color: "blue" },
    highlight: true,
    cta: "Select Pro",
    fallbackAmountCents: 34700,
    features: [
      inc("2 Test Engines"),
      inc("Selling + Delivery Engine"),
      inc("35 test submissions/month"),
      inc("10 kickstart free tests"),
      inc("Bulk tests: $247 for 20"),
      inc("1:1 onboarding call"),
      inc("Monthly group coaching"),
      inc("Training library"),
      inc("Standard Support Level"),
      inc("Monthly Sales Strategy"),
      exc("Customisation of IP"),
      exc("Revenue licensing"),
      exc("White Label Versions"),
      exc("Additional Revenue Through Licensing"),
      exc("API integrations"),
    ],
  },
  {
    tier: 3,
    name: "Growth",
    tagline: "Experts building niche authority",
    badge: { label: "Best value", color: "teal" },
    cta: "Select Growth",
    fallbackAmountCents: 54700,
    features: [
      inc("3 Test Engines"),
      inc("Selling + Delivery + People"),
      inc("50 test submissions/month"),
      inc("10 kickstart free tests"),
      inc("Bulk tests: $197 for 20"),
      inc("1:1 onboarding call"),
      inc("Monthly group coaching"),
      inc("Training library"),
      inc("Priority support"),
      inc("Niche IP customisation"),
      inc("Niche Feature (Creation Fee Applies)"),
      inc("Revenue licensing (2x ROI Within 6 Months*)"),
      inc("Optional API integrations"),
      exc("White Label Versions"),
    ],
  },
  {
    tier: 4,
    name: "Enterprise",
    tagline: "Organisations & large-scale operators",
    cta: "Get in touch",
    externalUrl: "https://profiletest.ai/contact-us",
    fallbackAmountCents: 99700,
    features: [
      inc("Full Engine Library"),
      inc("All available test engines"),
      inc("100 test submissions/month"),
      inc("10 kickstart free tests"),
      inc("Bulk tests: $147 for 20"),
      inc("1:1 onboarding call"),
      inc("Monthly group coaching"),
      inc("Training library"),
      inc("Priority support"),
      inc("Custom IP development"),
      inc("Enterprise on Your Expertise and Intellectual Property (Creation Fee Applies)"),
      inc("Revenue licensing (4x ROI Within 6 Months*)"),
      inc("Optional API integrations"),
      inc("White label versions (Creation Fee Applies)"),
    ],
  },
];
