// GET  — return the current onboarding plan selection.
// POST — save the selected subscription tier.
//
// Engine access is derived from the tier on the server:
//
// Tier 1 / Starter -> Sales
// Tier 2 / Pro     -> Sales + Coaching
// Tier 3 / Growth   -> Sales + Coaching + People
//
// Any `engines` value submitted by an older browser session is ignored.

import { NextResponse } from "next/server";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";
import { getAuthUser } from "../_lib/auth";
import { planSelectionSchema } from "@/app/(v2)/onboarding/v2/_lib/schema";
import {
  enginesForTier,
  isOnboardingTier,
  trialAllocation,
} from "@/app/(v2)/onboarding/v2/_lib/engines";
import type { PlanSelectionResponse } from "../_lib/types";

export const dynamic = "force-dynamic";

type SelectionRow = {
  selected_tier: number | null;
};

function jerr(error: string, status: number) {
  return NextResponse.json(
    { ok: false, error },
    { status }
  );
}

export async function GET() {
  try {
    const { user, error: authError } =
      await getAuthUser();

    if (authError) return authError;

    const { data, error } = await portalAdmin()
      .from("onboarding_selections")
      .select("selected_tier")
      .eq("user_id", user.id)
      .maybeSingle<SelectionRow>();

    if (error) {
      return jerr(error.message, 500);
    }

    const tier = data?.selected_tier;

    if (!isOnboardingTier(tier)) {
      const body: PlanSelectionResponse = {
        ok: true,
        selection: null,
      };

      return NextResponse.json(body);
    }

    const engines = enginesForTier(tier);

    const body: PlanSelectionResponse = {
      ok: true,
      selection: {
        engines,
        tier,
        minimum_tier: tier,
        trials: trialAllocation(engines),
      },
    };

    return NextResponse.json(body);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error";

    return jerr(message, 500);
  }
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } =
      await getAuthUser();

    if (authError) return authError;

    const raw = await req
      .json()
      .catch(() => ({}));

    const parsed =
      planSelectionSchema.safeParse(raw);

    if (!parsed.success) {
      return jerr(
        parsed.error.issues[0]?.message ??
          "Invalid input",
        400
      );
    }

    const tier = parsed.data.tier;
    const engines = enginesForTier(tier);

    if (engines.length === 0) {
      return jerr(
        "Select a subscription tier.",
        400
      );
    }

    const { error } = await portalAdmin().rpc(
      "fn_save_onboarding_selection",
      {
        p_user_id: user.id,
        p_engines: engines,
        p_tier: tier,
      }
    );

    if (error) {
      const message = error.message || "";

      if (message.includes("tier_below_minimum")) {
        return jerr(
          `Tier ${tier} does not support its assigned engines.`,
          400
        );
      }

      if (message.includes("no_engine_selected")) {
        return jerr(
          "No engines are configured for this plan.",
          500
        );
      }

      if (message.includes("invalid_tier")) {
        return jerr(
          "Select a subscription tier.",
          400
        );
      }

      return jerr(
        message || "Could not save selection",
        500
      );
    }

    const body: PlanSelectionResponse = {
      ok: true,
      selection: {
        engines,
        tier,
        minimum_tier: tier,
        trials: trialAllocation(engines),
      },
    };

    return NextResponse.json(body);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error";

    return jerr(message, 500);
  }
}
