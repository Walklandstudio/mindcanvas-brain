import "server-only";

import Stripe from "stripe";
import { NextResponse } from "next/server";

import { getAuthUser } from "@/app/api/onboarding/v2/_lib/auth";
import {
  getActiveEntitlement,
  getOrgRow,
  getOwnerPricesForTier,
  getSubmissionUsage,
  PILOT_GRACE_HOURS,
  PILOT_TIER,
  resolveOwnerOrgId,
} from "@/app/_lib/billing";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";
import { requireOrgAccess } from "@/lib/server/orgAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingDisplayStatus =
  | "active"
  | "past_due"
  | "payment_required"
  | "cancelled";

type BillingAccountRow = {
  id: string;
  org_id: string;
  billing_type: "owner" | "licensee";
  tier: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  period_start: string | null;
  period_end: string | null;
  past_due_since: string | null;
  billing_source: "onboarding" | "legacy";
  billing_interval: "monthly" | "annual";
  billing_required_from: string | null;
  created_at: string;
  updated_at: string;
};

type SafeInvoice = {
  id: string;
  number: string | null;
  created_at: string;
  status: string | null;
  amount_cents: number;
  currency: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
};

type FallbackPlan = {
  name: string;
  interval: string | null;
  amount_cents: number | null;
  currency: string | null;
};

type Founding100OfferRow = {
  status:
    | "eligible"
    | "claimed"
    | "redeemed"
    | "expired";
  starts_at: string;
  expires_at: string;
  redeemed_at: string | null;
};

type Founding100CampaignRow = {
  name: string;
  status: "active" | "inactive";
  target_tier: number;
  max_redemptions: number;
  monthly_allowance_override: number | null;
  engine_keys: string[];
};

const TIER_NAMES: Record<number, string> = {
  1: "MindCanvas Starter",
  2: "MindCanvas Pro",
  3: "MindCanvas Niche",
  4: "MindCanvas Enterprise",
};

const FALLBACK_MONTHLY_AMOUNTS: Record<
  number,
  number
> = {
  1: 14700,
  2: 34700,
  3: 54700,
  4: 99700,
};

function jerr(
  error: string,
  code: string,
  status: number
) {
  return NextResponse.json(
    { ok: false, error, code },
    { status }
  );
}

function getStripeSecretKey(): string {
  const isProduction =
    process.env.VERCEL_ENV === "production";

  const key = isProduction
    ? process.env.STRIPE_SECRET_KEY
    : process.env.SANDBOX_STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      isProduction
        ? "Missing STRIPE_SECRET_KEY"
        : "Missing SANDBOX_STRIPE_SECRET_KEY"
    );
  }

  return key;
}

function deriveDisplayStatus(
  orgStatus: string,
  stripeStatus: string | null | undefined
): BillingDisplayStatus {
  const status =
    stripeStatus?.trim().toLowerCase() ?? "";

  if (
    status === "active" ||
    status === "trialing"
  ) {
    return "active";
  }

  if (
    status === "past_due" ||
    status === "unpaid"
  ) {
    return "past_due";
  }

  if (
    status === "canceled" ||
    status === "cancelled" ||
    orgStatus === "archived"
  ) {
    return "cancelled";
  }

  return "payment_required";
}

function deriveNextAction(
  status: BillingDisplayStatus
): "checkout" | "reactivate" | "none" {
  if (status === "active") {
    return "none";
  }

  if (status === "past_due") {
    return "reactivate";
  }

  return "checkout";
}

function billingPriority(
  account: BillingAccountRow
) {
  const status =
    account.stripe_status?.toLowerCase() ?? "";

  const statusPriority: Record<string, number> = {
    active: 100,
    trialing: 90,
    past_due: 80,
    unpaid: 75,
    incomplete: 70,
    incomplete_expired: 65,
    paused: 60,
    canceled: 20,
    cancelled: 20,
  };

  return statusPriority[status] ?? 40;
}

function pickCurrentBillingAccount(
  rows: BillingAccountRow[]
): BillingAccountRow | null {
  if (!rows.length) {
    return null;
  }

  return rows.slice().sort((a, b) => {
    const priorityDifference =
      billingPriority(b) - billingPriority(a);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return (
      new Date(b.updated_at).getTime() -
      new Date(a.updated_at).getTime()
    );
  })[0];
}

function unixTimestampToIso(
  timestamp: number
): string {
  return new Date(
    timestamp * 1000
  ).toISOString();
}

function getDefaultFallbackPlan(
  tier: number | null,
  isLegacy: boolean,
  billingInterval: string | null
): FallbackPlan {
  if (!isLegacy || tier === null) {
    return {
      name: "MindCanvas subscription",
      interval: null,
      amount_cents: null,
      currency: null,
    };
  }

  return {
    name:
      TIER_NAMES[tier] ??
      `MindCanvas Tier ${tier}`,
    interval:
      billingInterval === "annual" ||
      billingInterval === "year"
        ? "year"
        : "month",
    amount_cents:
      billingInterval === "annual" ||
      billingInterval === "year"
        ? null
        : FALLBACK_MONTHLY_AMOUNTS[
            tier
          ] ?? null,
    currency: "usd",
  };
}

async function resolveFallbackPlan({
  tier,
  isLegacy,
  billingInterval,
}: {
  tier: number | null;
  isLegacy: boolean;
  billingInterval: string | null;
}): Promise<FallbackPlan> {
  const fallback = getDefaultFallbackPlan(
    tier,
    isLegacy,
    billingInterval
  );

  if (
    !isLegacy ||
    tier === null ||
    (billingInterval !== "monthly" &&
      billingInterval !== "month")
  ) {
    return fallback;
  }

  try {
    const { monthly } =
      await getOwnerPricesForTier(tier);

    if (!monthly) {
      return fallback;
    }

    return {
      name:
        TIER_NAMES[tier] ??
        `MindCanvas Tier ${tier}`,
      interval: monthly.interval,
      amount_cents: monthly.amount_cents,
      currency: monthly.currency,
    };
  } catch (error) {
    console.error(
      "[billing-summary] Unable to load configured tier price:",
      error
    );

    return fallback;
  }
}

async function getIncludedTrialAllowance(
  orgId: string,
  tier: number | null
): Promise<number | null> {
  if (tier === null) {
    return null;
  }

  const { data, error } = await portalAdmin()
    .from("entitlements")
    .select(
      "included_trials_per_month, updated_at"
    )
    .eq("org_id", orgId)
    .eq("tier", tier)
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[billing-summary] Unable to load configured test allowance:",
      error
    );

    return null;
  }

  const allowance =
    data?.included_trials_per_month;

  return typeof allowance === "number"
    ? allowance
    : null;
}

async function loadFounding100Offer(
  orgId: string
) {
  const admin = portalAdmin();

  const { data: offer, error: offerError } =
    await admin
      .from("campaign_offers")
      .select(
        "status, starts_at, expires_at, redeemed_at"
      )
      .eq("campaign_key", "founding_100")
      .eq("org_id", orgId)
      .maybeSingle<Founding100OfferRow>();

  // Campaign display must never make the normal billing page fail.
  if (offerError) {
    console.error(
      "[billing-summary] Unable to load Founding 100 offer:",
      offerError
    );
    return null;
  }

  if (!offer) {
    return null;
  }

  const [
    campaignResult,
    redeemedResult,
  ] = await Promise.all([
    admin
      .from("campaigns")
      .select(
        "name, status, target_tier, max_redemptions, monthly_allowance_override, engine_keys"
      )
      .eq("campaign_key", "founding_100")
      .maybeSingle<Founding100CampaignRow>(),

    admin
      .from("campaign_offers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("campaign_key", "founding_100")
      .eq("status", "redeemed"),
  ]);

  if (campaignResult.error) {
    console.error(
      "[billing-summary] Unable to load Founding 100 campaign:",
      campaignResult.error
    );
    return null;
  }

  if (redeemedResult.error) {
    console.error(
      "[billing-summary] Unable to count Founding 100 redemptions:",
      redeemedResult.error
    );
    return null;
  }

  const campaign = campaignResult.data;

  if (!campaign) {
    return null;
  }

  const redeemedCount =
    redeemedResult.count ?? 0;

  const remainingSlots = Math.max(
    0,
    campaign.max_redemptions -
      redeemedCount
  );

  const expiresAtMs =
    Date.parse(offer.expires_at);

  const windowExpired =
    Number.isFinite(expiresAtMs) &&
    Date.now() >= expiresAtMs;

  // Redemption is permanent. Otherwise the persisted seven-day expiry is
  // authoritative even if the database status has not yet been swept to
  // "expired".
  const effectiveStatus =
    offer.status === "redeemed"
      ? "redeemed"
      : windowExpired
        ? "expired"
        : offer.status;

  const availabilityReason =
    effectiveStatus === "redeemed"
      ? "redeemed"
      : campaign.status !== "active"
        ? "inactive"
        : effectiveStatus === "expired"
          ? "expired"
          : remainingSlots <= 0
            ? "sold_out"
            : effectiveStatus ===
                  "eligible" ||
                effectiveStatus ===
                  "claimed"
              ? null
              : "unavailable";

  return {
    campaign_key: "founding_100",
    name: campaign.name,
    status: effectiveStatus,
    available:
      availabilityReason === null,
    availability_reason:
      availabilityReason,
    starts_at: offer.starts_at,
    expires_at: offer.expires_at,
    redeemed_at: offer.redeemed_at,
    target_tier: campaign.target_tier,
    monthly_allowance_override:
      campaign.monthly_allowance_override,
    engine_keys: campaign.engine_keys,
    max_redemptions:
      campaign.max_redemptions,
    redeemed_count: redeemedCount,
    remaining_slots: remainingSlots,
  };
}

async function loadStripeDetails({
  customerId,
  subscriptionId,
  fallbackPlan,
}: {
  customerId: string | null;
  subscriptionId: string | null;
  fallbackPlan: FallbackPlan;
}) {
  if (!customerId) {
    return {
      plan: fallbackPlan,
      payment_method: null,
      invoices: [] as SafeInvoice[],
      cancel_at_period_end: false,
      cancel_at: null as string | null,
    };
  }

  try {
    const stripe = new Stripe(
      getStripeSecretKey()
    );

    const [
      subscription,
      paymentMethods,
      invoices,
    ] = await Promise.all([
      subscriptionId
        ? stripe.subscriptions.retrieve(
            subscriptionId,
            {
              expand: [
                "items.data.price.product",
              ],
            }
          )
        : Promise.resolve(null),

      stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      }),

      stripe.invoices.list({
        customer: customerId,
        limit: 12,
      }),
    ]);

    const price =
      subscription?.items.data[0]?.price ??
      null;

    const product = price?.product;

    const productName =
      product &&
      typeof product === "object" &&
      "name" in product &&
      typeof product.name === "string"
        ? product.name
        : null;

    const card =
      paymentMethods.data[0]?.card;

    return {
      plan: {
        name:
          productName ||
          price?.nickname ||
          fallbackPlan.name,
        interval:
          price?.recurring?.interval ??
          fallbackPlan.interval,
        amount_cents:
          price?.unit_amount ??
          fallbackPlan.amount_cents,
        currency:
          price?.currency ??
          fallbackPlan.currency,
      },

      payment_method: card
        ? {
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
          }
        : null,

      invoices: invoices.data.map(
        (invoice): SafeInvoice => ({
          id: invoice.id,
          number: invoice.number,
          created_at: unixTimestampToIso(
            invoice.created
          ),
          status: invoice.status,
          amount_cents:
            invoice.amount_paid ||
            invoice.total ||
            invoice.amount_due,
          currency: invoice.currency,
          hosted_invoice_url:
            invoice.hosted_invoice_url ??
            null,
          invoice_pdf:
            invoice.invoice_pdf ?? null,
        })
      ),
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
      cancel_at: subscription?.cancel_at ? unixTimestampToIso(subscription.cancel_at) : null,
    };
  } catch (error) {
    console.error(
      "[billing-summary] Unable to load Stripe display details:",
      error
    );

    return {
      plan: fallbackPlan,
      payment_method: null,
      invoices: [] as SafeInvoice[],
      cancel_at_period_end: false,
      cancel_at: null as string | null,
    };
  }
}

export async function GET(req: Request) {
  const auth = await getAuthUser();

  if (auth.error) {
    return auth.error;
  }

  const user = auth.user;
  const url = new URL(req.url);
  const orgIdHint =
    url.searchParams.get("orgId");

  let orgId: string;
  if (orgIdHint) {
    const access = await requireOrgAccess(orgIdHint);
    if (!access.ok) {
      return jerr(
        access.error,
        "org_access_denied",
        access.status
      );
    }
    orgId = orgIdHint;
  } else {
    const resolved = await resolveOwnerOrgId(
      user.id,
      null
    );
    if (!resolved.ok) {
      return jerr(
        resolved.error,
        resolved.code,
        resolved.status
      );
    }
    orgId = resolved.orgId;
  }

  const org = await getOrgRow(orgId);

  if (!org) {
    return jerr(
      "Org not found",
      "org_not_found",
      404
    );
  }

  const { data: billingData, error: billingError } =
    await portalAdmin()
      .from("billing_accounts")
      .select(
        "id, org_id, billing_type, tier, stripe_customer_id, stripe_subscription_id, stripe_status, period_start, period_end, past_due_since, billing_source, billing_interval, billing_required_from, created_at, updated_at"
      )
      .eq("org_id", orgId)
      .eq("billing_type", "owner")
      .order("updated_at", {
        ascending: false,
      });

  if (billingError) {
    return jerr(
      billingError.message,
      "billing_account_lookup_failed",
      500
    );
  }

  const billingRows = (billingData ?? []) as unknown as
    BillingAccountRow[];

  const billingAccount =
    pickCurrentBillingAccount(billingRows);

  const usage =
    await getSubmissionUsage(orgId);

  const isInternal = usage.exempt === true;

  const entitlement =
    await getActiveEntitlement(orgId);

  const isPilot =
    entitlement?.tier === PILOT_TIER;

  const graceEndsAt = isPilot
    ? entitlement?.period_end ?? null
    : null;

  const pilotEndDate =
    isPilot && entitlement?.period_end
      ? new Date(
          new Date(
            entitlement.period_end
          ).getTime() -
            PILOT_GRACE_HOURS *
              60 *
              60 *
              1000
        ).toISOString()
      : null;

  const displayStatus: BillingDisplayStatus = isInternal
    ? "active"
    : deriveDisplayStatus(
    org.status,
    billingAccount?.stripe_status
  );

  const isLegacy =
    billingAccount?.billing_source ===
    "legacy";

  const fallbackPlan =
    await resolveFallbackPlan({
      tier: billingAccount?.tier ?? null,
      isLegacy,
      billingInterval:
        billingAccount?.billing_interval ??
        null,
    });

  const includedTrialsPerMonth =
    billingAccount
      ? await getIncludedTrialAllowance(
          orgId,
          billingAccount.tier
        )
      : null;

  const founding100Offer =
    await loadFounding100Offer(orgId);

  const stripeDetails =
    await loadStripeDetails({
      customerId:
        billingAccount?.stripe_customer_id ??
        null,
      subscriptionId:
        billingAccount
          ?.stripe_subscription_id ?? null,
      fallbackPlan,
    });

  return NextResponse.json({
    ok: true,

    is_internal: isInternal,

    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
    },

    usage,

    campaign_offer: founding100Offer,

    billing: billingAccount
      ? {
          id: billingAccount.id,
          tier: billingAccount.tier,
          billing_type:
            billingAccount.billing_type,
          stripe_status:
            billingAccount.stripe_status,
          stripe_customer_id:
            billingAccount.stripe_customer_id,
          stripe_subscription_id:
            billingAccount.stripe_subscription_id,
          display_status: displayStatus,
          period_start:
            billingAccount.period_start,
          period_end:
            billingAccount.period_end,
          past_due_since:
            billingAccount.past_due_since,
          billing_source:
            billingAccount.billing_source,
          billing_interval:
            billingAccount.billing_interval,
          billing_required_from:
            billingAccount.billing_required_from,
          included_trials_per_month:
            includedTrialsPerMonth,
          is_pilot: isPilot,
          pilot_end_date: pilotEndDate,
          pilot_grace_ends_at: graceEndsAt,
          plan: stripeDetails.plan,
          payment_method:
            stripeDetails.payment_method,
          invoices:
            stripeDetails.invoices,
          cancel_at_period_end:
            stripeDetails.cancel_at_period_end,
          cancel_at:
            stripeDetails.cancel_at,
        }
      : null,

    next_action:
      deriveNextAction(displayStatus),
  });
}
