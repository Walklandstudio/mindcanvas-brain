// apps/web/app/_lib/billing.ts
// Server helpers for main-account billing (Stripe Checkout + entitlements).

import "server-only";
import { stripe } from "@/lib/stripe";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";
import { generateUniqueSlug } from "@/app/api/onboarding/v2/_lib/slug";

export type OwnerBillingAccount = {
  id: string;
  org_id: string;
  billing_type: "owner" | "licensee";
  tier: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  billing_source: string | null;
  billing_interval: string | null;
  period_start: string | null;
  period_end: string | null;
  past_due_since: string | null;
};

// Fixed product policy: a pilot gets 48h after pilot_end to subscribe before
// suspension. The pilot entitlement's period_end already = pilot_end + grace,
// so pilot_end is derived as period_end - PILOT_GRACE_HOURS.
export const PILOT_GRACE_HOURS = 48;

// The pilot tier sentinel (operator-seeded tier_definitions.tier = 0).
export const PILOT_TIER = 0;

export type ActiveEntitlement = {
  tier: number;
  status: string;
  period_start: string | null;
  period_end: string | null;
};

/** Resolve the org's current active entitlement (runtime source of truth for
 *  tier + billing period; tier === PILOT_TIER means the org is on the pilot). */
export async function getActiveEntitlement(orgId: string): Promise<ActiveEntitlement | null> {
  const { data, error } = await portalAdmin()
    .from("entitlements")
    .select("tier, status, period_start, period_end")
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ActiveEntitlement) ?? null;
}

export type TierPriceRow = {
  id: string;
  billing_type: "owner" | "licensee";
  tier_definition_id: string | null;
  stripe_price_id: string | null;
  interval: "month" | "year";
  currency: string;
  amount_cents: number;
  active: boolean;
  stripe_mode: StripeMode;
};

export type StripeMode = "sandbox" | "live";

/** Resolve which Stripe catalogue this deployment is allowed to use.
 *
 * Vercel should set STRIPE_MODE=sandbox for Preview and STRIPE_MODE=live for
 * Production. An unset value deliberately falls back to sandbox so a new
 * deployment cannot start charging live prices accidentally.
 */
export function getStripeMode(): StripeMode {
  const configured = process.env.STRIPE_MODE?.trim().toLowerCase();

  if (!configured) return "sandbox";
  if (configured === "sandbox" || configured === "live") return configured;

  throw new Error(
    "Invalid STRIPE_MODE. Expected 'sandbox' or 'live'."
  );
}

export async function getOwnerBillingAccount(orgId: string): Promise<OwnerBillingAccount | null> {
  const { data, error } = await portalAdmin()
    .from("billing_accounts")
    .select(
      "id, org_id, billing_type, tier, stripe_customer_id, stripe_subscription_id, stripe_status, billing_source, billing_interval, period_start, period_end, past_due_since"
    )
    .eq("org_id", orgId)
    .eq("billing_type", "owner")
    .maybeSingle();
  if (error) throw error;
  return (data as OwnerBillingAccount) ?? null;
}

/** Lookup the active monthly and annual prices for a specific tier (owner billing).
 *  tier_definitions is source of truth for tier metadata; tier_prices keyed by
 *  tier_definition_id is source of truth for Stripe price IDs. */
export async function getOwnerPricesForTier(tier: number): Promise<{
  monthly: TierPriceRow | null;
  annual: TierPriceRow | null;
}> {
  const admin = portalAdmin();
  const stripeMode = getStripeMode();

  const { data: tierDef, error: tdErr } = await admin
    .from("tier_definitions")
    .select("id, tier, valid_until")
    .eq("tier", tier)
    .is("valid_until", null)
    .maybeSingle();
  if (tdErr) throw tdErr;
  if (!tierDef?.id) return { monthly: null, annual: null };

  const { data: priceRows, error: priceErr } = await admin
    .from("tier_prices")
    .select(
      "id, billing_type, tier_definition_id, stripe_price_id, interval, currency, amount_cents, active, stripe_mode"
    )
    .eq("billing_type", "owner")
    .eq("active", true)
    .eq("stripe_mode", stripeMode)
    .in("interval", ["month", "year"])
    .eq("tier_definition_id", tierDef.id)
    .returns<TierPriceRow[]>();
  if (priceErr) throw priceErr;

  const rows = priceRows ?? [];

  return {
    monthly: rows.find((row) => row.interval === "month") ?? null,
    annual: rows.find((row) => row.interval === "year") ?? null,
  };
}

export async function ensureStripeCustomer(
  orgId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const ba = await getOwnerBillingAccount(orgId);
  if (!ba) throw new Error("billing_account_not_found");
  if (ba.stripe_customer_id) return ba.stripe_customer_id;

  const customer = await stripe.customers.create(
    {
      email,
      name: name ?? undefined,
      metadata: { org_id: orgId, billing_account_id: ba.id },
    },
    { idempotencyKey: `mc-customer-${orgId}` }
  );

  const { error } = await portalAdmin()
    .from("billing_accounts")
    .update({ stripe_customer_id: customer.id })
    .eq("id", ba.id);
  if (error) throw error;

  return customer.id;
}

/** Resolve the caller's org for billing. If orgIdHint provided, verify ownership.
 *  Otherwise auto-resolve to the single org owned by the user (else error). */
export async function resolveOwnerOrgId(userId: string, orgIdHint?: string | null): Promise<
  | { ok: true; orgId: string }
  | { ok: false; status: number; code: string; error: string }
> {
  const admin = portalAdmin();

  if (orgIdHint) {
    const { data, error } = await admin
      .from("user_orgs")
      .select("user_id, org_id, role")
      .eq("user_id", userId)
      .eq("org_id", orgIdHint)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, status: 404, code: "org_not_found", error: "Org not found for user" };
    if ((data as any).role !== "org_owner") {
      return { ok: false, status: 403, code: "not_org_owner", error: "Not an org owner" };
    }
    return { ok: true, orgId: orgIdHint };
  }

  const { data, error } = await admin
    .from("user_orgs")
    .select("org_id, role")
    .eq("user_id", userId)
    .eq("role", "org_owner");
  if (error) throw error;

  const orgs = (data ?? []) as Array<{ org_id: string; role: string }>;
  if (orgs.length === 0) return { ok: false, status: 404, code: "no_owned_org", error: "No org owned by user" };
  if (orgs.length > 1)
    return {
      ok: false,
      status: 400,
      code: "multiple_orgs_specify_id",
      error: "User owns multiple orgs; specify orgId",
    };
  return { ok: true, orgId: orgs[0].org_id };
}

export type ReserveSubmissionResult = {
  ok: boolean;
  reason?: "no_subscription" | "limit_reached";
  /** Which pot the submission was drawn from when ok. */
  source?: "engine_trial" | "subscription";
  engine_key?: string;
  allowance?: number;
  used?: number;
  remaining?: number;
  exempt?: boolean;
};

export function isSubmissionQuotaEnforced(): boolean {
  return process.env.SUBMISSION_QUOTA_ENFORCED !== "false";
}

export async function reserveSubmission(
  orgId: string,
  referenceId: string,
  /** Lets the RPC spend a per-engine trial credit before the subscription quota. */
  testId?: string | null
): Promise<ReserveSubmissionResult> {
  if (!isSubmissionQuotaEnforced()) return { ok: true };

  const { data, error } = await portalAdmin().rpc("fn_reserve_submission", {
    p_org_id: orgId,
    p_reference_id: referenceId,
    p_test_id: testId ?? null,
  });
  if (error) throw error;
  return data as ReserveSubmissionResult;
}

export type SubmissionUsage = {
  ok: boolean;
  reason?: "no_subscription";
  exempt?: boolean;
  allowance: number | null;
  used: number;
  remaining: number | null;
  /** Per-engine trial credits left; spent before the monthly allowance. */
  trial_remaining: number | null;
  period_start: string | null;
  period_end: string | null;
};

export async function getSubmissionUsage(orgId: string): Promise<SubmissionUsage> {
  const { data, error } = await portalAdmin().rpc("fn_submission_usage", {
    p_org_id: orgId,
  });
  if (error) throw error;
  return data as SubmissionUsage;
}

export type SubmissionAvailability = {
  ok: boolean;
  available: boolean;
  reason?: "no_subscription" | "limit_reached";
  exempt?: boolean;
  source?: "engine_trial" | "subscription";
  engine_key?: string | null;
  trial_remaining?: number;
};

/** Whether the org can submit THIS test right now (per-engine trial credit or
 *  subscription allowance), without consuming anything. Mirrors the decision
 *  fn_reserve_submission makes at submit time, so open/start gates match it. */
export async function getSubmissionAvailability(
  orgId: string,
  testId: string
): Promise<SubmissionAvailability> {
  if (!isSubmissionQuotaEnforced()) return { ok: true, available: true };
  const { data, error } = await portalAdmin().rpc("fn_submission_availability", {
    p_org_id: orgId,
    p_test_id: testId,
  });
  if (error) throw error;
  return data as SubmissionAvailability;
}

/** Create the onboarding placeholder org for a user who has saved a plan
 *  selection but has no org yet. Runs fn_create_onboarding_org, which applies
 *  the selection (engines + tier + free trial credits) and marks step 4 done.
 *  Shared by the Stripe checkout flow and the "skip payment" flow — both need
 *  the org (and its trial credits) to exist before the organisation step. */
export async function createOnboardingPlaceholderOrg(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<
  | { ok: true; orgId: string }
  | { ok: false; status: number; code: string; error: string }
> {
  const admin = portalAdmin();

  const { data: selection } = await admin
    .from("onboarding_selections")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();
  if (!selection) {
    return {
      ok: false,
      status: 400,
      code: "no_plan_selection",
      error: "Complete the plan selection first.",
    };
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = String(meta.first_name ?? "").trim();
  const lastName = String(meta.last_name ?? "").trim();
  // No placeholder name: the org is created blank and the organisation step
  // requires the user to enter the real name before it advances. Slug falls
  // back to "org" (generateUniqueSlug) until then.
  const orgName = "";
  const slug = await generateUniqueSlug(orgName);

  const { data: newOrgId, error: rpcErr } = await admin.rpc(
    "fn_create_onboarding_org",
    {
      p_user_id: user.id,
      p_name: orgName,
      p_slug: slug,
      p_address: null,
      p_country: "",
      p_billing_region: null as unknown as string,
      p_website_url: null,
      p_industry: null,
      p_logo_url: null,
    }
  );
  if (rpcErr) {
    return { ok: false, status: 500, code: "org_create_failed", error: rpcErr.message };
  }

  // Founding 100 enrollment begins after email verification, before the
  // onboarding organisation exists. Attach that existing campaign offer to
  // the new organisation as soon as the placeholder org is created.
  //
  // Normal onboarding users never carry this metadata, so their flow is
  // unchanged.
  const campaignKey =
    user.user_metadata?.campaign_key === "founding_100"
      ? "founding_100"
      : null;

  if (campaignKey) {
    const { error: campaignAttachError } = await admin.rpc(
      "fn_attach_campaign_offer_org",
      {
        p_user_id: user.id,
        p_org_id: newOrgId as string,
        p_campaign_key: campaignKey,
      }
    );

    if (campaignAttachError) {
      return {
        ok: false,
        status: 500,
        code: "campaign_offer_attach_failed",
        error: campaignAttachError.message,
      };
    }
  }

  const nowIso = new Date().toISOString();
  await admin
    .from("orgs")
    .update({
      terms_accepted_at: nowIso,
      privacy_accepted_at: nowIso,
      primary_contact_first_name: firstName || null,
      primary_contact_last_name: lastName || null,
      primary_contact_email: user.email ?? null,
    })
    .eq("id", newOrgId as string);

  return { ok: true, orgId: newOrgId as string };
}

export async function getOrgRow(orgId: string) {
  const { data, error } = await portalAdmin()
    .from("orgs")
    .select("id, name, slug, status")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; name: string; slug: string | null; status: string } | null;
}
