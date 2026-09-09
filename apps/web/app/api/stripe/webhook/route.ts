// apps/web/app/api/stripe/webhook/route.ts
// POST — canonical Stripe webhook for subscriptions and one-off purchases.

import "server-only";

import Stripe from "stripe";
import { NextResponse } from "next/server";

import { getStripeMode } from "@/app/_lib/billing";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventMeta = {
  orgId: string | null;
  customer: string | null;
  subId: string | null;
  stripeStatus: string | null;
  stripePriceId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  offerKey: string | null;
  certifiedConsultantAddOn: boolean;
};

type SubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

type SubscriptionItemWithPeriods = Stripe.SubscriptionItem & {
  current_period_start?: number;
  current_period_end?: number;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  parent?: {
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
    } | null;
  } | null;
};

type DisputeWithPaymentIntent = Stripe.Dispute & {
  payment_intent?: string | Stripe.PaymentIntent | null;
};

type OneOffPurchaseRow = {
  id: string;
  purchase_type: "usage_bundle" | "paid_test" | "report_upgrade";
  stripe_mode: "sandbox" | "live";
};

type OneOffEventResult = {
  handled: boolean;
  result?: unknown;
};

const SUBSCRIPTION_HANDLED = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

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

  const expectedPrefix = stripeMode === "live" ? "sk_live_" : "sk_test_";

  if (!key.startsWith(expectedPrefix)) {
    throw new Error(
      `STRIPE_MODE is ${stripeMode}, but the configured Stripe secret key is not a ${stripeMode} key.`,
    );
  }

  return key;
}

function getStripeWebhookSecret(): string {
  const stripeMode = getStripeMode();
  const secret =
    stripeMode === "live"
      ? process.env.STRIPE_WEBHOOK_SECRET
      : process.env.SANDBOX_STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      stripeMode === "live"
        ? "Missing STRIPE_WEBHOOK_SECRET"
        : "Missing SANDBOX_STRIPE_WEBHOOK_SECRET",
    );
  }

  return secret;
}

function getExpandableId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

function toIso(unix: number | null | undefined): string | null {
  if (unix === null || unix === undefined || !Number.isFinite(unix)) {
    return null;
  }

  return new Date(unix * 1000).toISOString();
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const subscriptionWithPeriods = subscription as SubscriptionWithPeriods;
  const firstItem = subscription.items.data[0] as
    | SubscriptionItemWithPeriods
    | undefined;

  return {
    periodStart: toIso(
      subscriptionWithPeriods.current_period_start ??
        firstItem?.current_period_start ??
        null,
    ),
    periodEnd: toIso(
      subscriptionWithPeriods.current_period_end ??
        firstItem?.current_period_end ??
        null,
    ),
  };
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const invoiceWithSubscription = invoice as InvoiceWithSubscription;

  return (
    getExpandableId(invoiceWithSubscription.subscription) ??
    getExpandableId(
      invoiceWithSubscription.parent?.subscription_details?.subscription,
    )
  );
}

function applySubscriptionMeta(
  meta: EventMeta,
  subscription: Stripe.Subscription,
): void {
  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

  meta.subId = subscription.id;
  meta.customer = getExpandableId(subscription.customer);
  meta.orgId = subscription.metadata?.org_id?.trim() || meta.orgId;
  meta.offerKey =
    subscription.metadata?.offer_key?.trim() || meta.offerKey;

  const certificationMeta =
    subscription.metadata?.certified_consultant_add_on;

  if (
    certificationMeta === "true" ||
    certificationMeta === "false"
  ) {
    meta.certifiedConsultantAddOn =
      certificationMeta === "true";
  }

  meta.stripeStatus = subscription.status;
  meta.stripePriceId =
    subscription.items.data[0]?.price?.id ?? null;
  meta.periodStart = periodStart;
  meta.periodEnd = periodEnd;
}

async function lookupOrgId(
  subscriptionId: string | null,
  customerId: string | null,
): Promise<string | null> {
  const sb = portalAdmin();

  if (subscriptionId) {
    const { data, error } = await sb
      .from("billing_accounts")
      .select("org_id")
      .eq("stripe_subscription_id", subscriptionId)
      .eq("billing_type", "owner")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`subscription_org_lookup_failed:${error.message}`);
    }

    if (data?.org_id) return String(data.org_id);
  }

  if (customerId) {
    const { data, error } = await sb
      .from("billing_accounts")
      .select("org_id")
      .eq("stripe_customer_id", customerId)
      .eq("billing_type", "owner")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`customer_org_lookup_failed:${error.message}`);
    }

    if (data?.org_id) return String(data.org_id);
  }

  return null;
}

async function extractMeta(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<EventMeta> {
  const obj = event.data.object;
  const meta: EventMeta = {
    orgId: null,
    customer: null,
    subId: null,
    stripeStatus: null,
    stripePriceId: null,
    periodStart: null,
    periodEnd: null,
    offerKey: null,
    certifiedConsultantAddOn: false,
  };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = obj as Stripe.Checkout.Session;

      meta.orgId =
        session.metadata?.org_id?.trim() || session.client_reference_id || null;
      meta.offerKey = session.metadata?.offer_key?.trim() || null;
      meta.certifiedConsultantAddOn =
        session.metadata?.certified_consultant_add_on === "true";
      meta.customer = getExpandableId(session.customer);
      meta.subId = getExpandableId(session.subscription);

      if (meta.subId) {
        const subscription = await stripe.subscriptions.retrieve(meta.subId);
        applySubscriptionMeta(meta, subscription);
      }

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      const eventSubscription = obj as Stripe.Subscription;
      const subscription = await stripe.subscriptions.retrieve(
        eventSubscription.id,
      );

      applySubscriptionMeta(meta, subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = obj as Stripe.Subscription;

      applySubscriptionMeta(meta, subscription);
      meta.stripeStatus = "canceled";
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required": {
      const invoice = obj as Stripe.Invoice;

      meta.customer = getExpandableId(invoice.customer);
      meta.subId = getInvoiceSubscriptionId(invoice);

      if (meta.subId) {
        const subscription = await stripe.subscriptions.retrieve(meta.subId);
        applySubscriptionMeta(meta, subscription);
      }

      if (event.type === "invoice.payment_failed" && !meta.stripeStatus) {
        meta.stripeStatus = "past_due";
      }

      break;
    }
  }

  if (!meta.orgId) {
    meta.orgId = await lookupOrgId(meta.subId, meta.customer);
  }

  return meta;
}

async function lookupOneOffPurchase(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<OneOffPurchaseRow | null> {
  const { data, error } = await portalAdmin()
    .from("purchases")
    .select("id, purchase_type, stripe_mode")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error) {
    throw new Error(`purchase_lookup_failed:${error.message}`);
  }

  if (data) return data as OneOffPurchaseRow;

  // Stripe does not guarantee event ordering. A refund/dispute can arrive
  // before checkout.session.completed has stored the Payment Intent on the
  // purchase, so recover the purchase ID from server-authored PI metadata.
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const metadataPurchaseId = paymentIntent.metadata?.purchase_id?.trim();

  if (!metadataPurchaseId) return null;

  const fallback = await portalAdmin()
    .from("purchases")
    .select("id, purchase_type, stripe_mode")
    .eq("id", metadataPurchaseId)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(`purchase_metadata_lookup_failed:${fallback.error.message}`);
  }

  return (fallback.data as OneOffPurchaseRow | null) ?? null;
}

function assertPurchaseMode(purchase: OneOffPurchaseRow): void {
  if (purchase.stripe_mode !== getStripeMode()) {
    throw new Error("purchase_stripe_mode_mismatch");
  }
}

async function callPurchaseRpc(
  functionName:
    | "fn_fulfill_one_off_purchase"
    | "fn_fail_one_off_purchase"
    | "fn_refund_one_off_purchase"
    | "fn_dispute_one_off_purchase",
  parameters: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await portalAdmin().rpc(
    functionName,
    parameters as never,
  );

  if (error) {
    throw new Error(`${functionName}_failed:${error.message}`);
  }

  return data;
}

async function fulfillReportUpgrade(
  purchaseId: string,
  eventId: string,
  session: Stripe.Checkout.Session,
): Promise<unknown> {
  const sb = portalAdmin();
  const purchase = await sb
    .from("purchases")
    .select("id, purchase_type, stripe_mode, gross_amount, currency, status, metadata")
    .eq("id", purchaseId)
    .maybeSingle();

  if (purchase.error) {
    throw new Error(`report_purchase_lookup_failed:${purchase.error.message}`);
  }
  if (!purchase.data) throw new Error("report_purchase_not_found");
  if (purchase.data.purchase_type !== "report_upgrade") {
    throw new Error("report_purchase_type_mismatch");
  }
  if (purchase.data.stripe_mode !== getStripeMode()) {
    throw new Error("purchase_stripe_mode_mismatch");
  }
  if (session.amount_total !== purchase.data.gross_amount) {
    throw new Error("purchase_amount_mismatch");
  }
  if ((session.currency || "").toLowerCase() !== purchase.data.currency) {
    throw new Error("purchase_currency_mismatch");
  }
  if (purchase.data.status === "paid") return { ok: true, duplicate: true };
  if (["refunded", "disputed"].includes(purchase.data.status)) {
    throw new Error(`purchase_not_fulfillable:${purchase.data.status}`);
  }

  const paymentIntentId = getExpandableId(session.payment_intent);
  if (!paymentIntentId) throw new Error("payment_intent_unresolved");

  const updated = await sb
    .from("purchases")
    .update({
      status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
      failed_at: null,
      reconciliation_required: false,
      metadata: {
        ...((purchase.data.metadata as Record<string, unknown> | null) || {}),
        paid_event_id: eventId,
      },
    })
    .eq("id", purchaseId);

  if (updated.error) {
    throw new Error(`report_purchase_fulfilment_failed:${updated.error.message}`);
  }

  return {
    ok: true,
    duplicate: false,
    purchase_id: purchaseId,
    purchase_type: "report_upgrade",
  };
}

async function handleOneOffCheckoutEvent(
  event: Stripe.Event,
): Promise<OneOffEventResult> {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed" &&
    event.type !== "checkout.session.expired"
  ) {
    return { handled: false };
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode !== "payment") return { handled: false };

  const purchaseId = session.metadata?.purchase_id?.trim();
  const purchaseType = session.metadata?.purchase_type?.trim();

  // Never send an unrelated payment-mode Checkout Session through the
  // subscription entitlement RPC.
  if (!purchaseId || !["usage_bundle", "report_upgrade"].includes(purchaseType || "")) {
    return {
      handled: true,
      result: { ignored: "unmanaged_payment_checkout" },
    };
  }

  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    const result = await callPurchaseRpc("fn_fail_one_off_purchase", {
      p_purchase_id: purchaseId,
      p_stripe_event_id: event.id,
      p_checkout_session_id: session.id,
      p_failure_reason: event.type,
    });

    return { handled: true, result };
  }

  // Some delayed payment methods complete Checkout before their payment is
  // final. The later async_payment_succeeded event is authoritative.
  if (session.payment_status !== "paid") {
    return {
      handled: true,
      result: { pending: true, payment_status: session.payment_status },
    };
  }

  const paymentIntentId = getExpandableId(session.payment_intent);

  if (!paymentIntentId) throw new Error("payment_intent_unresolved");
  if (session.amount_total === null) throw new Error("amount_total_unresolved");
  if (!session.currency) throw new Error("currency_unresolved");

  if (purchaseType === "report_upgrade") {
    const result = await fulfillReportUpgrade(purchaseId, event.id, session);
    return { handled: true, result };
  }

  const result = await callPurchaseRpc("fn_fulfill_one_off_purchase", {
    p_purchase_id: purchaseId,
    p_stripe_event_id: event.id,
    p_stripe_mode: getStripeMode(),
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_amount: session.amount_total,
    p_currency: session.currency,
  });

  return { handled: true, result };
}

async function handleRefundEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<OneOffEventResult> {
  if (event.type !== "charge.refunded") return { handled: false };

  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = getExpandableId(charge.payment_intent);

  if (!paymentIntentId) {
    return { handled: true, result: { ignored: "no_payment_intent" } };
  }

  const purchase = await lookupOneOffPurchase(stripe, paymentIntentId);

  if (!purchase) {
    return { handled: true, result: { ignored: "not_one_off_purchase" } };
  }

  assertPurchaseMode(purchase);

  const result = await callPurchaseRpc("fn_refund_one_off_purchase", {
    p_purchase_id: purchase.id,
    p_stripe_event_id: event.id,
    p_refunded_amount: charge.amount_refunded,
    p_currency: charge.currency,
  });

  return { handled: true, result };
}

async function handleDisputeEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<OneOffEventResult> {
  if (event.type !== "charge.dispute.created") return { handled: false };

  const dispute = event.data.object as DisputeWithPaymentIntent;
  let paymentIntentId = getExpandableId(dispute.payment_intent);

  if (!paymentIntentId) {
    const chargeId = getExpandableId(dispute.charge);

    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId);
      paymentIntentId = getExpandableId(charge.payment_intent);
    }
  }

  if (!paymentIntentId) {
    return { handled: true, result: { ignored: "no_payment_intent" } };
  }

  const purchase = await lookupOneOffPurchase(stripe, paymentIntentId);

  if (!purchase) {
    return { handled: true, result: { ignored: "not_one_off_purchase" } };
  }

  assertPurchaseMode(purchase);

  const result = await callPurchaseRpc("fn_dispute_one_off_purchase", {
    p_purchase_id: purchase.id,
    p_stripe_event_id: event.id,
  });

  return { handled: true, result };
}

async function handleOneOffEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<OneOffEventResult> {
  const checkoutResult = await handleOneOffCheckoutEvent(event);
  if (checkoutResult.handled) return checkoutResult;

  const refundResult = await handleRefundEvent(stripe, event);
  if (refundResult.handled) return refundResult;

  return handleDisputeEvent(stripe, event);
}

async function releaseFoundingCheckoutClaim(
  session: Stripe.Checkout.Session,
): Promise<unknown> {
  if (
    session.mode !== "subscription" ||
    session.metadata?.offer_key?.trim() !== "founding_100"
  ) {
    return { ignored: "not_founding_100" };
  }

  const orgId =
    session.metadata?.org_id?.trim() ||
    session.client_reference_id ||
    null;

  if (!orgId) {
    throw new Error("founding_100_org_id_unresolved");
  }

  const { data, error } = await portalAdmin().rpc(
    "fn_release_campaign_claim",
    {
      p_org_id: orgId,
      p_campaign_key: "founding_100",
      p_checkout_session_id: session.id,
    } as never,
  );

  if (error) {
    throw new Error(
      `founding_100_claim_release_failed:${error.message}`,
    );
  }

  return data;
}

async function handleFoundingCheckoutExpiry(
  event: Stripe.Event,
): Promise<OneOffEventResult> {
  if (event.type !== "checkout.session.expired") {
    return { handled: false };
  }

  const session =
    event.data.object as Stripe.Checkout.Session;

  if (
    session.mode !== "subscription" ||
    session.metadata?.offer_key?.trim() !== "founding_100"
  ) {
    return { handled: false };
  }

  const result =
    await releaseFoundingCheckoutClaim(session);

  return {
    handled: true,
    result,
  };
}

function isPaidFoundingEvent(
  event: Stripe.Event,
): boolean {
  if (event.type === "invoice.paid") {
    return true;
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type ===
      "checkout.session.async_payment_succeeded"
  ) {
    const session =
      event.data.object as Stripe.Checkout.Session;

    return session.payment_status === "paid";
  }

  return false;
}

function isDuplicateInsert(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = String(error.message || "").toLowerCase();

  return (
    error.code === "23505" ||
    message.includes("duplicate") ||
    message.includes("unique")
  );
}

async function prepareEvent(event: Stripe.Event): Promise<{
  shouldProcess: boolean;
}> {
  const sb = portalAdmin();
  const insert = await sb
    .from("stripe_events")
    .insert({
      stripe_event_id: event.id,
      type: event.type,
      payload: event as never,
      status: "ok",
    })
    .select("id")
    .maybeSingle();

  if (!insert.error) return { shouldProcess: true };

  if (!isDuplicateInsert(insert.error)) {
    throw new Error(`persist_failed:${insert.error.message}`);
  }

  const existing = await sb
    .from("stripe_events")
    .select("status, processed_at")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing.error || !existing.data) {
    throw new Error(
      `duplicate_lookup_failed:${existing.error?.message || "event_not_found"}`,
    );
  }

  if (existing.data.status === "ok" && existing.data.processed_at) {
    return { shouldProcess: false };
  }

  const retry = await sb
    .from("stripe_events")
    .update({
      type: event.type,
      payload: event as never,
      status: "ok",
      processed_at: null,
      error: null,
    })
    .eq("stripe_event_id", event.id);

  if (retry.error) {
    throw new Error(`retry_prepare_failed:${retry.error.message}`);
  }

  return { shouldProcess: true };
}

async function finishEvent(
  eventId: string,
  status: "ok" | "failed",
  error: string | null = null,
): Promise<void> {
  const result = await portalAdmin()
    .from("stripe_events")
    .update({
      processed_at: new Date().toISOString(),
      status,
      error,
    })
    .eq("stripe_event_id", eventId);

  if (result.error) {
    throw new Error(`event_finish_failed:${result.error.message}`);
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "missing_signature" },
      { status: 400 },
    );
  }

  let stripe: Stripe;
  let webhookSecret: string;

  try {
    stripe = new Stripe(getStripeSecretKey());
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe is not configured.";

    console.error("[stripe-webhook] Stripe configuration error:", error);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    return NextResponse.json(
      { ok: false, error: `signature_failed:${message}` },
      { status: 400 },
    );
  }

  try {
    const prepared = await prepareEvent(event);

    if (!prepared.shouldProcess) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const oneOff = await handleOneOffEvent(stripe, event);

    if (oneOff.handled) {
      await finishEvent(event.id, "ok");
      return NextResponse.json({
        ok: true,
        one_off: true,
        result: oneOff.result,
      });
    }

    const foundingExpiry =
      await handleFoundingCheckoutExpiry(event);

    if (foundingExpiry.handled) {
      await finishEvent(event.id, "ok");

      return NextResponse.json({
        ok: true,
        founding_100_claim_released: true,
        result: foundingExpiry.result,
      });
    }

    if (!SUBSCRIPTION_HANDLED.has(event.type)) {
      await finishEvent(event.id, "ok");
      return NextResponse.json({ ok: true, ignored: event.type });
    }

    const meta = await extractMeta(stripe, event);

    if (!meta.orgId) {
      await finishEvent(event.id, "failed", "org_id_unresolved");
      return NextResponse.json(
        { ok: false, error: "org_id_unresolved" },
        { status: 500 },
      );
    }

          const { error: rpcError } = await portalAdmin().rpc(
        "fn_apply_billing_event_v2",
        {
          p_event_id: event.id,
          p_event_type: event.type,
          p_org_id: meta.orgId,
          p_stripe_customer: meta.customer,
          p_stripe_sub_id: meta.subId,
          p_stripe_status: meta.stripeStatus,
          p_period_start: meta.periodStart,
          p_period_end: meta.periodEnd,
          p_stripe_price_id: meta.stripePriceId,
        } as never,
      );

    if (rpcError) {
      await finishEvent(event.id, "failed", rpcError.message);
      return NextResponse.json(
        { ok: false, error: `rpc_failed:${rpcError.message}` },
        { status: 500 },
      );
    }

    if (
      meta.offerKey === "founding_100" &&
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      await releaseFoundingCheckoutClaim(session);
    }

    if (
      meta.offerKey === "founding_100" &&
      meta.subId &&
      isPaidFoundingEvent(event) &&
      ["active", "trialing"].includes(
        meta.stripeStatus || "",
      )
    ) {
      const { error: foundingRedeemError } =
        await portalAdmin().rpc(
          "fn_redeem_campaign_offer",
          {
            p_org_id: meta.orgId,
            p_campaign_key: "founding_100",
            p_stripe_subscription_id: meta.subId,
            p_stripe_event_id: event.id,
            p_certification_purchased:
              meta.certifiedConsultantAddOn,
          } as never,
        );

      if (foundingRedeemError) {
        // Founding membership state is commercially authoritative.
        // Fail this webhook so Stripe retries rather than silently
        // leaving a paid customer without their campaign entitlement.
        await finishEvent(
          event.id,
          "failed",
          foundingRedeemError.message,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              `founding_100_redeem_failed:${foundingRedeemError.message}`,
          },
          { status: 500 },
        );
      }
    }

    if (
      meta.offerKey === "first_link_70_3m" &&
      ["active", "trialing"].includes(meta.stripeStatus || "")
    ) {
      const { error: redeemError } = await portalAdmin()
        .from("first_link_offers")
        .update({
          status: "redeemed",
          redeemed_at: new Date().toISOString(),
        })
        .eq("org_id", meta.orgId)
        .eq("offer_key", "first_link_70_3m")
        .in("status", ["offered", "claimed"]);

      if (redeemError) {
        // Billing has already succeeded. Never roll back or fail a valid
        // subscription because campaign tracking could not be updated.
        console.error(
          "[stripe-webhook] First-link offer redemption tracking failed:",
          redeemError,
        );
      }
    }

    // The subscription RPC marks the event complete transactionally. This is
    // a harmless second write and preserves rolling-deployment compatibility.
    await finishEvent(event.id, "ok");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[stripe-webhook] Failed to process ${event.type}:`, error);

    try {
      await finishEvent(event.id, "failed", message);
    } catch (finishError) {
      console.error("[stripe-webhook] Unable to record failure:", finishError);
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
