import type {
  InevitableStandardScoreResult,
} from "@/lib/inevitable-standard/scoreInevitableStandard";
import type {
  InevitableStandardConstraintResult,
} from "@/lib/inevitable-standard/constraintEngine";
import type {
  InevitableStandardPillar,
  InevitableStandardApproachCode,
} from "@/lib/inevitable-standard/definition";
import type {
  InevitableStandardRevenueInStructureResult,
} from "@/lib/inevitable-standard/revenueInStructure";

export type InevitableStandardGhlSyncResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  message?: string;
  response?: unknown;
};

type Taker = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
};

const PILLAR_ORDER: InevitableStandardPillar[] = [
  "identity",
  "positioning",
  "offer",
  "sales",
  "revenue_model",
  "decision",
];

const PILLAR_LABELS: Record<InevitableStandardPillar, string> = {
  identity: "Identity",
  positioning: "Positioning",
  offer: "Offer",
  sales: "Sales",
  revenue_model: "Revenue Model",
  decision: "Decision",
};

const FALSE_CONSTRAINT_LABELS: Record<string, string> = {
  lead_volume: "Not enough leads",
  price_too_high: "Pricing is too high",
  new_offer_needed: "Need a new offer",
  needs_systems: "Need better systems",
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function cleanEmail(value: unknown): string {
  return cleanText(value).toLowerCase();
}

function pushCustomField(
  customFields: Array<{ id: string; fieldValue: string | number }>,
  identifier: string | undefined,
  value: unknown,
) {
  const token = cleanText(identifier);
  if (!token || value == null) return;

  let fieldValue: string | number;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return;
    fieldValue = value;
  } else {
    const cleaned = cleanText(value);
    if (!cleaned) return;
    fieldValue = cleaned;
  }

  const id = token.startsWith("id:") ? cleanText(token.slice(3)) : token;
  if (!id) return;

  customFields.push({ id, fieldValue });
}

function uniqueTags(values: unknown[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    const tag = cleanText(value);
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

function strongestPillar(
  score: InevitableStandardScoreResult,
): InevitableStandardPillar {
  return PILLAR_ORDER.reduce((best, pillar) => {
    const bestPct = Number(score.pillars?.[best]?.percentage ?? 0);
    const candidatePct = Number(score.pillars?.[pillar]?.percentage ?? 0);
    return candidatePct > bestPct ? pillar : best;
  }, PILLAR_ORDER[0]);
}

function approachLabel(
  score: InevitableStandardScoreResult,
  approach: InevitableStandardApproachCode | "BALANCED" | null,
): string | null {
  if (!approach) return null;
  if (approach === "BALANCED") return "Balanced";
  return cleanText(score.approaches.labels?.[approach]) || approach;
}

function approachPercentage(
  score: InevitableStandardScoreResult,
  approach: InevitableStandardApproachCode | "BALANCED" | null,
): number | null {
  if (!approach || approach === "BALANCED") return null;
  const value = Number(score.approaches.percentages?.[approach]);
  return Number.isFinite(value) ? value : null;
}

function falseConstraintLabel(
  constraints: InevitableStandardConstraintResult | null,
): string {
  if (!constraints?.false_constraint?.mismatch) return "None";

  return (
    FALSE_CONSTRAINT_LABELS[cleanText(constraints.false_constraint_rule_id)] ||
    PILLAR_LABELS[constraints.false_constraint.stated_pillar] ||
    "Possible false constraint"
  );
}

function formatCommercialValueRange(
  revenue: InevitableStandardRevenueInStructureResult | null,
): string | null {
  if (!revenue || revenue.needs_revenue_confirmation) return null;

  const currency = cleanText(revenue.currency) || "USD";

  const formatValue = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currency} ${Math.round(value).toLocaleString("en-US")}`;
    }
  };

  return `${formatValue(revenue.range_low)}–${formatValue(revenue.range_high)}`;
}

export async function syncInevitableStandardToGhl(args: {
  taker: Taker;
  testLinkName: string | null;
  snapshotUrl: string;
  fullReportUrl: string;
  completedAt: string;
  score: InevitableStandardScoreResult;
  constraints: InevitableStandardConstraintResult | null;
  revenueInStructure: InevitableStandardRevenueInStructureResult | null;
}): Promise<InevitableStandardGhlSyncResult> {
  const serviceBase =
    cleanText(process.env.INEVITABLE_STANDARD_SERVICE_BASE_URL) ||
    "https://services.leadconnectorhq.com";

  const endpoint =
    cleanText(process.env.INEVITABLE_STANDARD_CONTACT_UPSERT_URL) ||
    `${serviceBase}/contacts/upsert`;

  const apiKey = cleanText(process.env.INEVITABLE_STANDARD_API_KEY);
  const locationId = cleanText(process.env.INEVITABLE_STANDARD_LOCATION_ID);
  const apiVersion =
    cleanText(process.env.INEVITABLE_STANDARD_API_VERSION) || "2021-07-28";

  if (!apiKey || !locationId) {
    return {
      ok: false,
      skipped: true,
      message:
        "Skipped Inevitable Standard Tekmatix sync because API key or Location ID is missing.",
    };
  }

  const email = cleanEmail(args.taker.email);
  const phone = cleanText(args.taker.phone);

  if (!email && !phone) {
    return {
      ok: false,
      skipped: true,
      message:
        "Skipped Inevitable Standard Tekmatix sync because the taker has neither email nor phone.",
    };
  }

  const score = args.score;
  const constraints = args.constraints;
  const revenueInStructure = args.revenueInStructure;
  const primaryApproach = score.approaches.dominant;
  const secondaryApproach = score.approaches.secondary;
  const strongest = strongestPillar(score);

  const customFields: Array<{ id: string; fieldValue: string | number }> = [];

  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_READINESS_SCORE, score.overall.percentage);
  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_READINESS_LEVEL, score.overall.label);
  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_IDENTITY_SCORE, score.pillars.identity.percentage);
  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_POSITIONING_SCORE, score.pillars.positioning.percentage);
  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_OFFER_SCORE, score.pillars.offer.percentage);
  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_SALES_SCORE, score.pillars.sales.percentage);
  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_REVENUE_MODEL_SCORE, score.pillars.revenue_model.percentage);
  pushCustomField(customFields, process.env.INEVITABLE_STANDARD_CF_DECISION_SCORE, score.pillars.decision.percentage);

  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_PRIMARY_CONSTRAINT,
    constraints ? PILLAR_LABELS[constraints.primary_constraint] : null,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_SECONDARY_CONSTRAINT,
    constraints ? PILLAR_LABELS[constraints.secondary_constraint] : null,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_STRONGEST_PILLAR,
    PILLAR_LABELS[strongest],
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_PRIORITY_FIX_ORDER,
    constraints
      ? constraints.priority_fix_order
          .map((pillar) => PILLAR_LABELS[pillar])
          .join(" -> ")
      : null,
  );

  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_PRIMARY_APPROACH,
    approachLabel(score, primaryApproach),
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_PRIMARY_APPROACH_PERCENTAGE,
    approachPercentage(score, primaryApproach),
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_SECONDARY_APPROACH,
    approachLabel(score, secondaryApproach),
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_SECONDARY_APPROACH_PERCENTAGE,
    approachPercentage(score, secondaryApproach),
  );

  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_FALSE_CONSTRAINT,
    falseConstraintLabel(constraints),
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_Q13_RESPONSE,
    score.context_answers?.[13],
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_Q29_RESPONSE,
    score.context_answers?.[29],
  );

  const hasCommercialValue =
    revenueInStructure != null &&
    !revenueInStructure.needs_revenue_confirmation;

  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_COMMERCIAL_VALUE_RANGE,
    hasCommercialValue
      ? formatCommercialValueRange(revenueInStructure)
      : null,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_COMMERCIAL_VALUE_LOW,
    hasCommercialValue ? revenueInStructure?.range_low : null,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_COMMERCIAL_VALUE_HIGH,
    hasCommercialValue ? revenueInStructure?.range_high : null,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_COMMERCIAL_VALUE_CURRENCY,
    revenueInStructure?.currency,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_COMMERCIAL_VALUE_TIMEFRAME,
    revenueInStructure
      ? `${revenueInStructure.timeframe_months} months`
      : null,
  );

  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_SNAPSHOT_URL,
    args.snapshotUrl,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_FULL_REPORT_URL,
    args.fullReportUrl,
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_COMPLETED_AT,
    args.completedAt.slice(0, 10),
  );
  pushCustomField(
    customFields,
    process.env.INEVITABLE_STANDARD_CF_TEST_LINK_NAME,
    args.testLinkName,
  );

  const fullName = [args.taker.first_name, args.taker.last_name]
    .map(cleanText)
    .filter(Boolean)
    .join(" ")
    .trim();

  const payload: Record<string, unknown> = {
    locationId,
    firstName: cleanText(args.taker.first_name) || undefined,
    lastName: cleanText(args.taker.last_name) || undefined,
    name: fullName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    source: "MindCanvas - The Inevitable Standard",
    customFields: customFields.length ? customFields : undefined,
  };

  const companyName = cleanText(args.taker.company);
  if (companyName) payload.companyName = companyName;

  try {
    const upsertResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: apiVersion,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const rawUpsert = await upsertResponse.text();
    let parsedUpsert: unknown = rawUpsert;

    try {
      parsedUpsert = rawUpsert ? JSON.parse(rawUpsert) : null;
    } catch {
      // Keep raw response for diagnostics.
    }

    if (!upsertResponse.ok) {
      return {
        ok: false,
        status: upsertResponse.status,
        message: `Inevitable Standard Tekmatix contact upsert failed with status ${upsertResponse.status}.`,
        response: parsedUpsert,
      };
    }

    const parsedRecord =
      parsedUpsert && typeof parsedUpsert === "object"
        ? (parsedUpsert as Record<string, any>)
        : {};

    const contactId = cleanText(
      parsedRecord?.contact?.id || parsedRecord?.contactId || parsedRecord?.id,
    );

    const completionTag =
      cleanText(process.env.INEVITABLE_STANDARD_TAG_COMPLETED) ||
      "Inevitable Standard - Completed";

    const tags = uniqueTags([completionTag, args.testLinkName]);

    if (!tags.length) {
      return {
        ok: true,
        status: upsertResponse.status,
        response: { upsert: parsedUpsert, tags: [] },
      };
    }

    if (!contactId) {
      return {
        ok: false,
        status: upsertResponse.status,
        message:
          "Inevitable Standard contact was upserted, but the response did not contain a contact ID, so tags could not be applied.",
        response: parsedUpsert,
      };
    }

    const tagsResponse = await fetch(
      `${serviceBase}/contacts/${encodeURIComponent(contactId)}/tags`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: apiVersion,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags }),
        cache: "no-store",
      },
    );

    const rawTags = await tagsResponse.text();
    let parsedTags: unknown = rawTags;

    try {
      parsedTags = rawTags ? JSON.parse(rawTags) : null;
    } catch {
      // Keep raw response for diagnostics.
    }

    if (!tagsResponse.ok) {
      return {
        ok: false,
        status: tagsResponse.status,
        message: `Inevitable Standard contact synced, but adding tags failed with status ${tagsResponse.status}.`,
        response: { upsert: parsedUpsert, tags: parsedTags },
      };
    }

    return {
      ok: true,
      status: upsertResponse.status,
      response: { upsert: parsedUpsert, tags: parsedTags },
    };
  } catch (error) {
    return {
      ok: false,
      message: `Inevitable Standard Tekmatix request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
