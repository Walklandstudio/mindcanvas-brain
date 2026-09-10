// apps/web/app/api/billing/upgrade/route.ts
// POST — open Stripe's confirmation flow for an existing subscription upgrade.

import "server-only";

import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  getOrgRow,
  getOwnerBillingAccount,
  getOwnerPricesForTier,
  getStripeMode,
  resolveOwnerOrgId,
} from "@/app/_lib/billing";
import { getAuthUser } from "@/app/api/onboarding/v2/_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpgradeRequest = {
  orgId?: string;
  targetTier?: number;
};

function jerr(
  error: string,
  code: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      code,
    },
    { status },
  );
}

function getStripeClient(): Stripe {
  const stripeMode = getStripeMode();

  const key =
    stripeMode === "live"
      ? process.env.STRIPE_SECRET_KEY
      : process.env.SANDBOX_STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      stripeMode === "live"
        ? "Missing STRIPE_SECRET_KEY"
        : "Missing SANDBOX_STRIPE_SECRET_KEY",
    );
  }

  const expectedPrefix =
    stripeMode === "live" ? "sk_live_" : "sk_test_";

  if (!key.startsWith(expectedPrefix)) {
    throw new Error(
      `STRIPE_MODE is ${stripeMode}, but the configured Stripe secret key is not a ${stripeMode} key.`,
    );
  }

  return new Stripe(key);
}

async function readRequest(
  req: Request,
): Promise<UpgradeRequest> {
  try {
    return (await req.json()) as UpgradeRequest;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser();

    if (auth.error) {
      return auth.error;
    }

    const body = await readRequest(req);

    if (
      !Number.isInteger(body.targetTier) ||
      ![2, 3].includes(body.targetTier as number)
    ) {
      return jerr(
        "Select Pro or Growth as the upgrade plan.",
        "invalid_target_tier",
        400,
      );
    }

    const targetTier = body.targetTier as 2 | 3;

    const resolved = await resolveOwnerOrgId(
      auth.user.id,
      body.orgId ?? null,
    );

    if (!resolved.ok) {
      return jerr(
        resolved.error,
        resolved.code,
        resolved.status,
      );
    }

    const [org, billingAccount] = await Promise.all([
      getOrgRow(resolved.orgId),
      getOwnerBillingAccount(resolved.orgId),
    ]);

    if (!org || !billingAccount) {
      return jerr(
        "Billing information was not found.",
        "billing_not_found",
        404,
      );
    }

    if (!org.slug) {
      return jerr(
        "The organisation has no portal slug.",
        "org_slug_missing",
        409,
      );
    }

    if (
      billingAccount.stripe_status !== "active" &&
      billingAccount.stripe_status !== "trialing"
    ) {
      return jerr(
        "An active subscription is required before upgrading.",
        "subscription_not_active",
        409,
      );
    }

    if (
      !billingAccount.stripe_customer_id ||
      !billingAccount.stripe_subscription_id
    ) {
      return jerr(
        "The Stripe subscription is not linked correctly.",
        "stripe_subscription_missing",
        409,
      );
    }

    const currentTier = billingAccount.tier;

    if (!currentTier || currentTier < 1) {
      return jerr(
        "The current subscription tier could not be determined.",
        "current_tier_missing",
        409,
      );
    }

    if (targetTier <= currentTier) {
      return jerr(
        "The selected plan must be higher than the current plan.",
        "not_an_upgrade",
        409,
      );
    }

    const stripe = getStripeClient();

    const subscription =
      await stripe.subscriptions.retrieve(
        billingAccount.stripe_subscription_id,
      );

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    if (
      customerId !==
      billingAccount.stripe_customer_id
    ) {
      return jerr(
        "The Stripe customer does not match this organisation.",
        "stripe_customer_mismatch",
        409,
      );
    }

    if (subscription.items.data.length !== 1) {
      return jerr(
        "This subscription cannot be upgraded automatically.",
        "unsupported_subscription_items",
        409,
      );
    }

    const subscriptionItem =
      subscription.items.data[0];

    const interval =
      subscriptionItem.price.recurring?.interval;

    if (interval !== "month" && interval !== "year") {
      return jerr(
        "The current billing interval is not supported.",
        "unsupported_billing_interval",
        409,
      );
    }

    const prices =
      await getOwnerPricesForTier(targetTier);

    const targetPrice =
      interval === "year"
        ? prices.annual
        : prices.monthly;

    if (
      !targetPrice?.stripe_price_id ||
      !targetPrice.active
    ) {
      return jerr(
        `The ${interval} price for Tier ${targetTier} is not configured.`,
        "upgrade_price_missing",
        409,
      );
    }

    if (
      targetPrice.currency.toLowerCase() !==
      subscriptionItem.price.currency.toLowerCase()
    ) {
      return jerr(
        "The upgrade price currency does not match the current subscription.",
        "upgrade_currency_mismatch",
        409,
      );
    }

    const origin = new URL(req.url).origin;

    const returnUrl =
      `${origin}/portal/${encodeURIComponent(org.slug)}/billing` +
      `?upgrade=processing&targetTier=${targetTier}`;

    const session =
      await stripe.billingPortal.sessions.create({
        customer:
          billingAccount.stripe_customer_id,
        return_url: returnUrl,
        flow_data: {
          type: "subscription_update_confirm",
          subscription_update_confirm: {
            subscription: subscription.id,
            items: [
              {
                id: subscriptionItem.id,
                price: targetPrice.stripe_price_id,
                quantity:
                  subscriptionItem.quantity ?? 1,
              },
            ],
          },
          after_completion: {
            type: "redirect",
            redirect: {
              return_url: returnUrl,
            },
          },
        },
      });

    return NextResponse.json({
      ok: true,
      url: session.url,
      targetTier,
    });
  } catch (error) {
    console.error("[billing-upgrade]", error);

    return jerr(
      error instanceof Error
        ? error.message
        : "Unable to start the subscription upgrade.",
      "upgrade_session_failed",
      500,
    );
  }
}