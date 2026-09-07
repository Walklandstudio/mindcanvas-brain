// apps/web/app/api/billing/legacy-checkout/route.ts
import "server-only";

import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  getAdminClient,
  getAppOrigin,
  requireActiveOrgId,
} from "@/app/_lib/portal";

import { getOwnerPricesForTier, getStripeMode } from "@/app/_lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingAccountRow = {
  id: string;
  org_id: string;
  billing_type: string;
  tier: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  billing_source: string;
  billing_interval: string;
  billing_required_from: string | null;
};

type CheckoutRequest = {
  presentation?: "embedded" | "hosted";
};

function getStripeSecretKey(): string {
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

  return key;
}

function isMissingStripeResource(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    raw?: {
      code?: string;
    };
  };

  return (
    candidate.code === "resource_missing" ||
    candidate.raw?.code === "resource_missing"
  );
}

function getCheckoutErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      raw?: {
        message?: unknown;
      };
    };

    if (typeof candidate.message === "string") {
      return candidate.message;
    }

    if (typeof candidate.raw?.message === "string") {
      return candidate.raw.message;
    }
  }

  return "Unable to create Stripe Checkout session.";
}

async function readCheckoutRequest(
  req: Request,
): Promise<CheckoutRequest> {
  try {
    return (await req.json()) as CheckoutRequest;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await requireActiveOrgId();

    const requestBody =
      await readCheckoutRequest(req);

    const presentation =
      requestBody.presentation === "hosted"
        ? "hosted"
        : "embedded";

    const admin =
      await getAdminClient();

    const portal =
      admin.schema("portal");

    const {
      data: org,
      error: orgError,
    } = await portal
      .from("orgs")
      .select("id, name, slug")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !org) {
      return NextResponse.json(
        {
          ok: false,
          error:
            orgError?.message ||
            "Organisation not found.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: billingData,
      error: billingError,
    } = await portal
      .from("billing_accounts")
      .select(
        [
          "id",
          "org_id",
          "billing_type",
          "tier",
          "stripe_customer_id",
          "stripe_subscription_id",
          "stripe_status",
          "billing_source",
          "billing_interval",
          "billing_required_from",
        ].join(","),
      )
      .eq("org_id", orgId)
      .eq("billing_type", "owner")
      .eq("billing_source", "legacy")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const billingAccount =
      billingData as BillingAccountRow | null;

    if (
      billingError ||
      !billingAccount
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            billingError?.message ||
            "No legacy billing account exists for this organisation.",
        },
        {
          status: 404,
        },
      );
    }

    const stripeStatus =
      billingAccount.stripe_status
        ?.trim()
        .toLowerCase() ?? "";

    if (
      stripeStatus === "active" ||
      stripeStatus === "trialing"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This organisation already has an active subscription.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      billingAccount.billing_interval !==
        "monthly" &&
      billingAccount.billing_interval !==
        "month"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This legacy checkout currently supports monthly subscriptions only.",
        },
        {
          status: 400,
        },
      );
    }

    const { monthly } =
      await getOwnerPricesForTier(
        billingAccount.tier,
      );

    if (
      !monthly?.stripe_price_id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `No active monthly Stripe price is configured for Tier ${billingAccount.tier}.`,
        },
        {
          status: 409,
        },
      );
    }

    const stripe =
      new Stripe(
        getStripeSecretKey(),
      );

    let stripePrice: Stripe.Price;

    try {
      stripePrice =
        await stripe.prices.retrieve(
          monthly.stripe_price_id,
        );
    } catch (error) {
      if (
        isMissingStripeResource(error)
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: `The Tier ${billingAccount.tier} monthly Price ID does not exist in the configured ${getStripeMode()} Stripe account.`,
            code:
              "stripe_price_mode_mismatch",
          },
          {
            status: 409,
          },
        );
      }

      throw error;
    }

    if (
      !stripePrice.active ||
      stripePrice.type !==
        "recurring" ||
      stripePrice.recurring
        ?.interval !== "month"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `The Tier ${billingAccount.tier} Stripe price is not an active monthly recurring price.`,
          code:
            "invalid_stripe_price",
        },
        {
          status: 409,
        },
      );
    }

    let stripeCustomerId =
      billingAccount.stripe_customer_id;

    if (stripeCustomerId) {
      try {
        const existingCustomer =
          await stripe.customers.retrieve(
            stripeCustomerId,
          );

        if (
          existingCustomer.deleted
        ) {
          stripeCustomerId = null;
        }
      } catch (error) {
        if (
          isMissingStripeResource(
            error,
          )
        ) {
          stripeCustomerId = null;
        } else {
          throw error;
        }
      }
    }

    if (!stripeCustomerId) {
      const customer =
        await stripe.customers.create(
          {
            name: org.name,
            metadata: {
              org_id: org.id,
              org_slug: org.slug,
              billing_account_id:
                billingAccount.id,
              billing_source:
                "legacy",
            },
          },
        );

      stripeCustomerId =
        customer.id;

      const {
        error:
          customerUpdateError,
      } = await portal
        .from("billing_accounts")
        .update({
          stripe_customer_id:
            stripeCustomerId,
        })
        .eq(
          "id",
          billingAccount.id,
        );

      if (
        customerUpdateError
      ) {
        throw new Error(
          `Unable to save Stripe customer: ${customerUpdateError.message}`,
        );
      }
    }

    const origin =
      await getAppOrigin();

    const commonParams: Stripe.Checkout.SessionCreateParams =
      {
        mode: "subscription",
        customer:
          stripeCustomerId,
        client_reference_id:
          org.id,

        // Allow customers to enter Stripe promotion codes
        // during subscription checkout.
        allow_promotion_codes:
          true,

        line_items: [
          {
            price:
              monthly.stripe_price_id,
            quantity: 1,
          },
        ],

        metadata: {
          org_id: org.id,
          org_slug:
            org.slug,
          billing_account_id:
            billingAccount.id,
          billing_source:
            "legacy",
          billing_interval:
            "monthly",
          tier: String(
            billingAccount.tier,
          ),
        },

        subscription_data: {
          metadata: {
            org_id:
              org.id,
            org_slug:
              org.slug,
            billing_account_id:
              billingAccount.id,
            billing_source:
              "legacy",
            billing_interval:
              "monthly",
            tier: String(
              billingAccount.tier,
            ),
          },
        },
      };

    const sessionParams: Stripe.Checkout.SessionCreateParams =
      presentation ===
      "hosted"
        ? {
            ...commonParams,

            success_url:
              `${origin}/portal/billing` +
              `?billing=success` +
              `&orgId=${encodeURIComponent(
                org.id,
              )}` +
              `&session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              `${origin}/portal/billing` +
              `?billing=cancelled` +
              `&orgId=${encodeURIComponent(
                org.id,
              )}`,
          }
        : {
            ...commonParams,

            ui_mode:
              "embedded",

            redirect_on_completion:
              "if_required",

            return_url:
              `${origin}/portal/${org.slug}` +
              `?billing=return` +
              `&session_id={CHECKOUT_SESSION_ID}`,
          };

    const session =
      await stripe.checkout.sessions.create(
        sessionParams,
      );

    if (
      presentation === "hosted"
    ) {
      if (!session.url) {
        throw new Error(
          "Stripe did not return a Checkout URL.",
        );
      }

      return NextResponse.json({
        ok: true,
        url: session.url,
        session_id:
          session.id,
      });
    }

    if (
      !session.client_secret
    ) {
      throw new Error(
        "Stripe did not return an Embedded Checkout client secret.",
      );
    }

    return NextResponse.json({
      ok: true,
      client_secret:
        session.client_secret,
      session_id:
        session.id,
    });
  } catch (error) {
    console.error(
      "[legacy-checkout]",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          getCheckoutErrorMessage(
            error,
          ),
        code:
          "stripe_checkout_failed",
      },
      {
        status: 500,
      },
    );
  }
}