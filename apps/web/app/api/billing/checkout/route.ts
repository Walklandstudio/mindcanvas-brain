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
    offer?: "first-link-70";
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

  if (body.offer !== undefined && body.offer !== "first-link-70") {
    return jerr("Unknown checkout offer", "invalid_offer", 400);
  }

  const wantsFirstLinkOffer = body.offer === "first-link-70";

  if (wantsFirstLinkOffer && interval !== "month") {
    return jerr(
      "The first-link offer is available on monthly subscriptions only",
      "offer_monthly_only",
      400
    );
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

  let firstLinkOfferId: string | null = null;
  let firstLinkPromotionCodeId: string | null = null;

  if (wantsFirstLinkOffer) {
    firstLinkPromotionCodeId =
      process.env.STRIPE_FIRST_LINK_PROMOTION_CODE_ID?.trim() || null;

    if (!firstLinkPromotionCodeId) {
      return jerr(
        "The first-link promotion is not configured",
        "first_link_offer_not_configured",
        503
      );
    }

    const { data: offerRow, error: offerErr } = await portalAdmin()
      .from("first_link_offers")
      .select("id, status")
      .eq("org_id", orgId)
      .eq("offer_key", "first_link_70_3m")
      .maybeSingle<{ id: string; status: string }>();

    if (offerErr) {
      return jerr(
        offerErr.message,
        "first_link_offer_lookup_failed",
        500
      );
    }

    if (
      !offerRow ||
      !["offered", "claimed"].includes(offerRow.status)
    ) {
      return jerr(
        "This organisation is not eligible for the first-link offer",
        "first_link_offer_not_eligible",
        403
      );
    }

    const { count: paidEntitlementCount, error: entitlementErr } =
      await portalAdmin()
        .from("entitlements")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active");

    if (entitlementErr) {
      return jerr(
        entitlementErr.message,
        "first_link_offer_entitlement_check_failed",
        500
      );
    }

    if ((paidEntitlementCount ?? 0) > 0) {
      return jerr(
        "This organisation already has an active subscription",
        "first_link_offer_already_subscribed",
        409
      );
    }

    firstLinkOfferId = offerRow.id;
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

  const orgQs = `orgId=${encodeURIComponent(orgId)}`;
  // Payment is a step inside onboarding now, so it has to come back to the
  // billing confirmation screen on the same host that started Checkout. This
  // keeps Preview/Staging on its own domain while the webhook is confirmed.
  // The env overrides stay authoritative for the portal flow, which is where
  // clients who already have an org pay from.
  const isOnboarding = body.flow === "onboarding";
  const requestOrigin = new URL(req.url).origin;
  const baseUrl = isOnboarding ? requestOrigin : getBaseUrl();
  const successBase = isOnboarding
    ? `${baseUrl}/onboarding/v2/billing?status=success&interval=${interval}`
    : process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
      `${baseUrl}/portal/billing?status=success`;
  const cancelBase = isOnboarding
    ? `${baseUrl}/onboarding/v2/billing?status=cancelled&interval=${interval}`
    : process.env.STRIPE_CHECKOUT_CANCEL_URL ||
      `${baseUrl}/portal/billing?status=cancelled`;
  const successUrl = `${successBase}${successBase.includes("?") ? "&" : "?"}${orgQs}`;
  const cancelUrl = `${cancelBase}${cancelBase.includes("?") ? "&" : "?"}${orgQs}`;

  // Per-minute idempotency bucket: collapse accidental double-submits, allow legitimate retries.
  const bucket = Math.floor(Date.now() / 60_000);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: lineItems,
        success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        allow_promotion_codes: wantsFirstLinkOffer ? false : true,
        ...(wantsFirstLinkOffer && firstLinkPromotionCodeId
          ? {
              discounts: [
                {
                  promotion_code: firstLinkPromotionCodeId,
                },
              ],
            }
          : {}),
        subscription_data: {
          metadata: {
            org_id: orgId,
            billing_account_id: ba.id,
            billing_interval: interval,
            ...(wantsFirstLinkOffer
              ? { offer_key: "first_link_70_3m" }
              : {}),
          },
        },
        client_reference_id: orgId,
        metadata: {
          org_id: orgId,
          billing_account_id: ba.id,
          billing_interval: interval,
          ...(wantsFirstLinkOffer
            ? { offer_key: "first_link_70_3m" }
            : {}),
        },
      },
      {
        idempotencyKey: `mc-checkout-${orgId}-${ba.id}-${interval}-${
          wantsFirstLinkOffer ? "firstlink70" : "standard"
        }-${bucket}`,
      }
    );
  } catch (e: any) {
    if (e?.type === "StripeInvalidRequestError") return jerr(e.message, "stripe_invalid_request", 400);
    if (e?.type === "StripeRateLimitError") return jerr("Stripe is busy, try again", "stripe_rate_limit", 429);
    return jerr(e?.message || "Stripe error", "stripe_error", 502);
  }

  if (wantsFirstLinkOffer && firstLinkOfferId) {
    const { error: claimErr } = await portalAdmin()
      .from("first_link_offers")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
      })
      .eq("id", firstLinkOfferId)
      .in("status", ["offered", "claimed"]);

    if (claimErr) {
      // Checkout itself is already valid and discounted. Do not strand the
      // customer because optional campaign tracking could not be updated.
      console.error("First-link offer claim tracking failed", claimErr);
    }
  }

  return NextResponse.json({
    ok: true,
    url: session.url,
    sessionId: session.id,
  });
}
