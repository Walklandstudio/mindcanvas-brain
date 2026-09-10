// POST — activate the fixed onboarding Free Trial.
//
// Every Free Trial receives:
// - Tier 1
// - Sales Engine / GED only
// - Three completed test submissions
//
// The server overwrites any previously saved onboarding selection before
// creating or updating the organisation. This prevents a crafted request from
// obtaining Pro or Growth engine access without payment.

import { NextResponse } from "next/server";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";
import { getAuthUser } from "../_lib/auth";
import {
  createOnboardingPlaceholderOrg,
  getOrgRow,
  resolveOwnerOrgId,
} from "@/app/_lib/billing";
import {
  FREE_TRIAL_ENGINE,
  FREE_TRIAL_TIER,
  freeTrialEngines,
} from "@/app/(v2)/onboarding/v2/_lib/engines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST() {
  try {
    const auth = await getAuthUser();

    if (auth.error) return auth.error;

    const user = auth.user;
    const admin = portalAdmin();

    const resolved = await resolveOwnerOrgId(
      user.id,
      null
    );

    let orgId: string | null = null;

    if (resolved.ok) {
      orgId = resolved.orgId;

      // A paid organisation cannot be changed back into an onboarding trial
      // by directly calling this endpoint.
      const {
        data: activeEntitlement,
        error: entitlementError,
      } = await admin
        .from("entitlements")
        .select("id")
        .eq("org_id", orgId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (entitlementError) {
        return jerr(
          entitlementError.message,
          "entitlement_check_failed",
          500
        );
      }

      if (activeEntitlement) {
        return jerr(
          "A Free Trial cannot replace an active paid subscription.",
          "active_subscription",
          409
        );
      }
    } else if (
      resolved.code !== "no_owned_org"
    ) {
      return jerr(
        resolved.error,
        resolved.code,
        resolved.status
      );
    }

    const engines = freeTrialEngines();

    // Force the authoritative Free Trial selection. If the organisation
    // already exists, the database function immediately applies the change,
    // revoking onboarding-sourced engines outside Sales/GED.
    const { error: selectionError } =
      await admin.rpc(
        "fn_save_onboarding_selection",
        {
          p_user_id: user.id,
          p_engines: engines,
          p_tier: FREE_TRIAL_TIER,
        }
      );

    if (selectionError) {
      return jerr(
        selectionError.message,
        "free_trial_selection_failed",
        500
      );
    }

    // New users do not have an organisation yet. The placeholder creation
    // applies the fixed Sales/GED selection and creates its three credits.
    if (!orgId) {
      const created =
        await createOnboardingPlaceholderOrg(user);

      if (!created.ok) {
        return jerr(
          created.error,
          created.code,
          created.status
        );
      }

      orgId = created.orgId;
    }

    // A cancelled Pro/Niche checkout may already have created unused
    // per-engine allocations. Remove those abandoned allocations so the
    // Free Trial summary and usage gate contain GED only.
    const { error: cleanupError } = await admin
      .from("engine_trial_allocations")
      .delete()
      .eq("org_id", orgId)
      .eq("allocation_type", "trial")
      .neq("engine_key", FREE_TRIAL_ENGINE);

    if (cleanupError) {
      return jerr(
        cleanupError.message,
        "free_trial_cleanup_failed",
        500
      );
    }

    // Map the GED test onto the organisation without creating a paid
    // entitlement. Once all three GED credits are consumed, the existing
    // submission-availability function returns `limit_reached`.
    const { error: grantError } =
      await admin.rpc(
        "fn_grant_onboarding_trial_access",
        {
          p_org_id: orgId,
        }
      );

    if (grantError) {
      return jerr(
        grantError.message,
        "test_access_grant_failed",
        500
      );
    }

    const org = await getOrgRow(orgId);

    return NextResponse.json({
      ok: true,
      org_slug: org?.slug ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error";

    return jerr(
      message,
      "unexpected_error",
      500
    );
  }
}
