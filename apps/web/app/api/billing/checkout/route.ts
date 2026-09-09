// apps/web/app/api/billing/checkout/route.ts
// POST — create a Stripe Checkout Session for the caller's org.

import "server-only";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { getAuthUser } from "@/app/api/onboarding/v2/_lib/auth";
import {
  createOnboardingPlaceholderOrg,
  ensureStripeCustomer,
  getActiveEntitlement,
  getOrgRow,
  getOwnerBillingAccount,
  getOwnerPricesForTier,
  PILOT_TIER,
  resolveOwnerOrgId,
} from "@/app/_lib/billing";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";
import { getBaseUrl } from "@/lib/baseUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jerr(error: string, code: string, status: number) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  let body: {
    orgId?: string;
    tier?: number;
    flow?: string;
    interval?: "month" | "year";
    offer?: "founding-100";
    addCertification?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  if (body.tier !== undefined && (!Number.isInteger(body.tier) || body.tier < 1 || body.tier > 4)) {
    return jerr("tier must be an integer between 1 and 4", "invalid_tier", 400);
  }
  if (
    body.interval !== undefined &&
    body.interval !== "month" &&
    body.interval !== "year"
  ) {
    return jerr(
      "interval must be month or year",
      "invalid_interval",
      400
    );
  }
  const interval = body.interval ?? "month";

  if (
    body.offer !== undefined &&
    body.offer !== "founding-100"
  ) {
    return jerr("Unknown checkout offer", "invalid_offer", 400);
  }

  if (
    body.addCertification !== undefined &&
    typeof body.addCertification !== "boolean"
  ) {
    return jerr(
      "addCertification must be a boolean",
      "invalid_certification_add_on",
      400
    );
  }

  const wantsFounding100Offer = body.offer === "founding-100";

  if (body.addCertification && !wantsFounding100Offer) {
    return jerr(
      "Certification is only available with the Founding 100 offer",
      "certification_requires_founding_offer",
      400
    );
  }

  // Founding 100 is always Tier 2. Do not trust a browser-supplied tier.
  if (wantsFounding100Offer) {
    body.tier = 2;
  }

  const resolved = await resolveOwnerOrgId(user.id, body.orgId ?? null);
  let orgId: string;
  if (resolved.ok) {
    orgId = resolved.orgId;
  } else if (resolved.code === "no_owned_org" && body.flow === "onboarding") {
    // Auto-create a placeholder org so the user goes straight from plan to Stripe.
    const created = await createOnboardingPlaceholderOrg(user);
    if (!created.ok) return jerr(created.error, created.code, created.status);
    orgId = created.orgId;
  } else {
    return jerr(resolved.error, resolved.code, resolved.status);
  }

  const org = await getOrgRow(orgId);
  if (!org) return jerr("Org not found", "org_not_found", 404);

  const orgSlug = org.slug?.trim();
  if (!orgSlug) {
    return jerr("Org slug missing", "org_slug_missing", 500);
  }

  if (org.status === "archived") return jerr("Org archived", "org_archived", 409);
  if (org.status === "suspended") return jerr("Org suspended", "org_suspended", 409);
  // Pilot orgs are 'active' but haven't paid — let them upgrade to a paid plan.
  // Non-pilot active orgs already have a live subscription. The active tier-0
  // entitlement is the runtime signal that the org is still on the pilot.
  if (org.status === "active") {
    const ent = await getActiveEntitlement(orgId);
    if (ent?.tier !== PILOT_TIER) return jerr("Org already active", "org_already_active", 409);
  }

  // Onboarding rule: the number of engines the org selected sets the minimum
  // tier. Recomputed here from portal.org_engines — the browser's tier is only
  // honoured when it is at least the minimum. Falls back to the tier stored on
  // the org (chosen on onboarding step 3) when the request omits one.
  const { count: engineCount, error: engineErr } = await portalAdmin()
    .from("org_engines")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "active");
  if (engineErr) return jerr(engineErr.message, "engine_lookup_failed", 500);

  const minTier = engineCount ?? 0;

  if (minTier > 0) {
    const { data: orgTier } = await portalAdmin()
      .from("orgs")
      .select("selected_tier")
      .eq("id", orgId)
      .maybeSingle<{ selected_tier: number | null }>();

    if (body.tier === undefined && orgTier?.selected_tier) {
      body.tier = orgTier.selected_tier;
    }
    if (body.tier !== undefined && body.tier < minTier) {
      return jerr(
        `Tier ${body.tier} does not support ${minTier} engines`,
        "tier_below_minimum",
        400
      );
    }
  }

  if (body.tier !== undefined) {
    const admin = portalAdmin();
    const existing = await getOwnerBillingAccount(orgId);
    if (existing) {
      const { error } = await admin
        .from("billing_accounts")
        .update({ tier: body.tier })
        .eq("id", existing.id);
      if (error) return jerr(error.message, "tier_update_failed", 500);
    } else {
      const { error } = await admin.from("billing_accounts").insert({
        org_id: orgId,
        billing_type: "owner",
        tier: body.tier,
        stripe_status: null,
      });
      if (error) return jerr(error.message, "billing_account_create_failed", 500);
    }
  }

  const ba = await getOwnerBillingAccount(orgId);
  if (!ba) return jerr("Billing account missing", "billing_account_missing", 500);
  if (!ba.tier) return jerr("Billing account has no tier", "tier_missing", 409);
  // The request may omit a tier entirely and fall back to whatever the billing
  // account already carries (e.g. a stale tier from an earlier attempt), so the
  // engine rule is checked once more against the tier that reaches Stripe.
  if (minTier > 0 && ba.tier < minTier) {
    return jerr(
      `Tier ${ba.tier} does not support ${minTier} engines`,
      "tier_below_minimum",
      400
    );
  }

  let prices;
  try {
    prices = await getOwnerPricesForTier(ba.tier);
  } catch (e: any) {
    return jerr(e?.message || "Price lookup failed", "price_lookup_failed", 500);
  }
  const selectedPrice =
    interval === "year" ? prices.annual : prices.monthly;
  if (
    !selectedPrice?.stripe_price_id ||
    selectedPrice.stripe_price_id.endsWith("_PLACEHOLDER") ||
    !selectedPrice.amount_cents ||
    selectedPrice.amount_cents <= 0
  ) {
    return jerr(
      `No active ${interval === "year" ? "annual" : "monthly"} plan for tier ${ba.tier}`,
      "prices_not_configured",
      502
    );
  }
  if (!user.email) return jerr("User has no email", "email_required", 400);

  let founding100OfferId: string | null = null;
  let founding100PromotionCodeId: string | null = null;
  let founding100ClaimExpiresAt: number | null = null;
  let certificationPriceId: string | null = null;

  if (wantsFounding100Offer) {
    founding100PromotionCodeId =
      process.env.STRIPE_FOUNDING_100_PROMOTION_CODE_ID?.trim() || null;

    if (!founding100PromotionCodeId) {
      return jerr(
        "The Founding 100 promotion is not configured",
        "founding_100_not_configured",
        503
      );
    }

    if (body.addCertification) {
      certificationPriceId =
        process.env.STRIPE_CERTIFIED_CONSULTANT_PRICE_ID?.trim() || null;

      if (!certificationPriceId) {
        return jerr(
          "The Certified Consultant add-on is not configured",
          "certification_not_configured",
          503
        );
      }
    }

    const admin = portalAdmin();

    const { error: claimErr } = await admin.rpc(
      "fn_claim_campaign_offer",
      {
        p_org_id: orgId,
        p_campaign_key: "founding_100",
      }
    );

    if (claimErr) {
      const message = claimErr.message || "";

      if (message.includes("campaign_sold_out")) {
        return jerr(
          "The Founding 100 offer has sold out",
          "founding_100_sold_out",
          409
        );
      }

      if (message.includes("campaign_offer_expired")) {
        return jerr(
          "The Founding 100 invitation has expired",
          "founding_100_expired",
          410
        );
      }

      if (message.includes("campaign_offer_not_found")) {
        return jerr(
          "This organisation is not eligible for the Founding 100 offer",
          "founding_100_not_eligible",
          403
        );
      }

      if (message.includes("campaign_offer_already_redeemed")) {
        return jerr(
          "This Founding 100 offer has already been redeemed",
          "founding_100_already_redeemed",
          409
        );
      }

      if (message.includes("campaign_not_active")) {
        return jerr(
          "The Founding 100 campaign is not active",
          "founding_100_inactive",
          409
        );
      }

      return jerr(
        "Unable to reserve the Founding 100 offer",
        "founding_100_claim_failed",
        500
      );
    }

    const { data: foundingOffer, error: foundingOfferErr } = await admin
      .from("campaign_offers")
      .select(
        "id, status, expires_at, claim_expires_at, stripe_checkout_session_id"
      )
      .eq("campaign_key", "founding_100")
      .eq("org_id", orgId)
      .maybeSingle<{
        id: string;
        status: string;
        expires_at: string;
        claim_expires_at: string | null;
        stripe_checkout_session_id: string | null;
      }>();

    if (foundingOfferErr || !foundingOffer) {
      return jerr(
        foundingOfferErr?.message || "Founding 100 claim could not be loaded",
        "founding_100_claim_lookup_failed",
        500
      );
    }

    founding100OfferId = foundingOffer.id;

    const claimExpiresAtMs = Date.parse(
      foundingOffer.claim_expires_at || ""
    );

    if (!Number.isFinite(claimExpiresAtMs)) {
      return jerr(
        "The Founding 100 reservation expiry is invalid",
        "founding_100_invalid_claim_expiry",
        500
      );
    }

    founding100ClaimExpiresAt = Math.floor(
      claimExpiresAtMs / 1000
    );

    // Reuse an already-open Checkout Session when the user double-clicks or
    // returns to the CTA with the same billing choices.
    if (foundingOffer.stripe_checkout_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          foundingOffer.stripe_checkout_session_id
        );

        const sameInterval =
          existingSession.metadata?.billing_interval === interval;
        const sameCertification =
          existingSession.metadata?.certified_consultant_add_on ===
          (body.addCertification ? "true" : "false");

        const sessionFitsClaim =
          existingSession.expires_at != null &&
          founding100ClaimExpiresAt != null &&
          existingSession.expires_at <=
            founding100ClaimExpiresAt - 4 * 60;

        if (
          existingSession.status === "open" &&
          existingSession.url &&
          sameInterval &&
          sameCertification &&
          sessionFitsClaim
        ) {
          return NextResponse.json({
            ok: true,
            url: existingSession.url,
            sessionId: existingSession.id,
            resumed: true,
          });
        }

        if (existingSession.status === "complete") {
          return jerr(
            "This Founding 100 checkout has already completed",
            "founding_100_checkout_complete",
            409
          );
        }

        if (existingSession.status === "open") {
          await stripe.checkout.sessions.expire(existingSession.id);
        }
      } catch (e) {
        console.error(
          "Unable to inspect previous Founding 100 Checkout Session",
          e
        );
      }
    }
  }

  let customerId: string;
  try {
    customerId = await ensureStripeCustomer(orgId, user.email, org.name);
  } catch (e: any) {
    return jerr(e?.message || "Customer create failed", "customer_create_failed", 502);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: selectedPrice.stripe_price_id, quantity: 1 },
  ];

  if (
    wantsFounding100Offer &&
    body.addCertification &&
    certificationPriceId
  ) {
    lineItems.push({
      price: certificationPriceId,
      quantity: 1,
    });
  }

  const orgQs = `orgId=${encodeURIComponent(orgId)}`;
  // Payment is a step inside onboarding now, so it has to come back to the
  // billing confirmation screen on the same host that started Checkout. This
  // keeps Preview/Staging on its own domain while the webhook is confirmed.
  // The env overrides stay authoritative for the portal flow, which is where
  // clients who already have an org pay from.
  const isOnboarding = body.flow === "onboarding";
  const requestOrigin = new URL(req.url).origin;
  const baseUrl = isOnboarding ? requestOrigin : getBaseUrl();

  const orgBillingUrl =
    `${requestOrigin}/portal/${encodeURIComponent(orgSlug)}/billing`;

  const returnsToOrgBilling = wantsFounding100Offer;

  const successBase = isOnboarding
    ? `${baseUrl}/onboarding/v2/billing?status=success&interval=${interval}`
    : returnsToOrgBilling
      ? `${orgBillingUrl}?status=success`
      : process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
        `${baseUrl}/portal/billing?status=success`;

  const cancelBase = isOnboarding
    ? `${baseUrl}/onboarding/v2/billing?status=cancelled&interval=${interval}`
    : returnsToOrgBilling
      ? `${orgBillingUrl}?status=cancelled`
      : process.env.STRIPE_CHECKOUT_CANCEL_URL ||
        `${baseUrl}/portal/billing?status=cancelled`;
  const successUrl = `${successBase}${successBase.includes("?") ? "&" : "?"}${orgQs}`;
  const cancelUrl = `${cancelBase}${cancelBase.includes("?") ? "&" : "?"}${orgQs}`;

  // Per-minute idempotency bucket: collapse accidental double-submits, allow legitimate retries.
  const bucket = Math.floor(Date.now() / 60_000);

  let founding100CheckoutExpiresAt: number | null = null;

  if (wantsFounding100Offer) {
    if (!founding100ClaimExpiresAt) {
      return jerr(
        "The Founding 100 reservation expiry is missing",
        "founding_100_claim_expiry_missing",
        500
      );
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const reservationBufferSeconds = 4 * 60;
    const stripeSessionSeconds = 31 * 60;
    const stripeMinimumSeconds = 30 * 60;

    const latestStripeExpiry =
      founding100ClaimExpiresAt -
      reservationBufferSeconds;

    if (
      latestStripeExpiry - nowSeconds <
      stripeMinimumSeconds
    ) {
      return jerr(
        "The current Founding 100 reservation is too close to expiry to start a new checkout",
        "founding_100_claim_window_closed",
        409
      );
    }

    founding100CheckoutExpiresAt = Math.min(
      nowSeconds + stripeSessionSeconds,
      latestStripeExpiry
    );
  }

  const offerMetadata: Record<string, string> =
    wantsFounding100Offer
      ? {
          campaign_key: "founding_100",
          offer_key: "founding_100",
          certified_consultant_add_on: body.addCertification
            ? "true"
            : "false",
        }
      : {};

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: lineItems,
        success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        ...(wantsFounding100Offer
          ? {
              discounts: [
                {
                  promotion_code: founding100PromotionCodeId!,
                },
              ],
              // Stripe requires Checkout expiry to be at least 30 minutes.
              // The 31-minute session always ends before both the campaign
              // deadline and the database reservation.
              expires_at: founding100CheckoutExpiresAt!,
            }
          : {
              allow_promotion_codes: true,
            }),
        subscription_data: {
          metadata: {
            org_id: orgId,
            billing_account_id: ba.id,
            billing_interval: interval,
            ...offerMetadata,
          },
        },
        client_reference_id: orgId,
        metadata: {
          org_id: orgId,
          billing_account_id: ba.id,
          billing_interval: interval,
          ...offerMetadata,
        },
      },
      {
        idempotencyKey: `mc-checkout-${orgId}-${ba.id}-${interval}-${
          wantsFounding100Offer
            ? `founding100-${body.addCertification ? "cert" : "base"}`
            : "standard"
        }-${bucket}`,
      }
    );
  } catch (e: any) {
    if (e?.type === "StripeInvalidRequestError") return jerr(e.message, "stripe_invalid_request", 400);
    if (e?.type === "StripeRateLimitError") return jerr("Stripe is busy, try again", "stripe_rate_limit", 429);
    return jerr(e?.message || "Stripe error", "stripe_error", 502);
  }

  if (wantsFounding100Offer && founding100OfferId) {
    const { error: foundingTrackErr } = await portalAdmin()
      .from("campaign_offers")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", founding100OfferId)
      .eq("status", "claimed");

    if (foundingTrackErr) {
      console.error(
        "Founding 100 Checkout Session tracking failed",
        foundingTrackErr
      );
    }
  }

  return NextResponse.json({
    ok: true,
    url: session.url,
    sessionId: session.id,
  });
}
