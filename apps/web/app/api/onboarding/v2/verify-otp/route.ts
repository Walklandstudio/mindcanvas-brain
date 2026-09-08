//apps/web/app/api/onboarding/v2/verify-otp/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/_lib/portal";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";
import { verifyOtpSchema } from "@/app/(v2)/onboarding/v2/_lib/schema";
import { syncOnboardingAccountToGhl } from "@/lib/server/ghl/onboardingContact";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = verifyOtpSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 }
      );
    }

    const { email, token } = parsed.data;

    const sb = await getServerSupabase();

    const { data, error } = await sb.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error || !data?.user) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired code" },
        { status: 401 }
      );
    }

    const metadata = data.user.user_metadata ?? {};

    const campaignKey =
      metadata.campaign_key === "founding_100"
        ? "founding_100"
        : null;

    if (campaignKey) {
      const { error: campaignError } = await portalAdmin().rpc(
        "fn_enroll_campaign_offer",
        {
          p_user_id: data.user.id,
          p_campaign_key: campaignKey,
        }
      );

      if (campaignError) {
        // Verification has already succeeded, so never strand the user here.
        // The campaign marker remains in auth metadata and can be reconciled.
        console.error(
          `[verify-otp] campaign enrollment failed user_id=${data.user.id} campaign=${campaignKey}`,
          campaignError
        );
      }
    }

    const ghlResult = await syncOnboardingAccountToGhl({
      userId: data.user.id,
      email: data.user.email || email,
      firstName:
        typeof metadata.first_name === "string"
          ? metadata.first_name
          : null,
      lastName:
        typeof metadata.last_name === "string"
          ? metadata.last_name
          : null,
    });

    if (!ghlResult.ok) {
      console.warn(
        `[verify-otp] onboarding completed but GHL sync was not successful user_id=${data.user.id} skipped=${Boolean(
          ghlResult.skipped
        )} message=${ghlResult.message || "Unknown error"}`
      );
    }

    return NextResponse.json({
      ok: true,
      user_id: data.user.id,
      ghl_sync: ghlResult.ok
        ? "synced"
        : ghlResult.skipped
          ? "skipped"
          : "failed",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
