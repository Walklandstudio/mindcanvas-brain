//apps/web/app/api/onboarding/v2/signup/route.ts
import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  portalAdmin,
} from "@/app/_lib/supabaseAdmin";
import { signupSchema } from "@/app/(v2)/onboarding/v2/_lib/schema";
import { findUserByEmail } from "@/app/_lib/findUserByEmail";
import { sendSignupNotification } from "@/lib/server/signupNotification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = signupSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 }
      );
    }

    const {
      first_name,
      last_name,
      email,
      password,
      campaign,
    } = parsed.data;

    const acceptedAt = new Date().toISOString();
    const source = new URL(req.url).pathname.includes("/pilot/")
      ? "pilot"
      : "default";

    const admin = supabaseAdmin();
    const existing = await findUserByEmail(email);

    if (existing?.email_confirmed_at) {
      // Block only when the user already has a fully activated organisation.
      // Otherwise, preserve the existing password and allow onboarding to resume.
      const { data: membership } = await portalAdmin()
        .from("user_orgs")
        .select("orgs(status)")
        .eq("user_id", existing.id)
        .maybeSingle<{
          orgs: { status: string } | null;
        }>();

      if (membership?.orgs?.status === "active") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "An account with this email already exists. Please log in.",
          },
          { status: 409 }
        );
      }
    } else if (existing) {
      // Support an interrupted signup attempt. The account is still
      // unverified, so update its password and signup details before
      // sending a fresh verification code.
      const { error: updateError } =
        await admin.auth.admin.updateUserById(existing.id, {
          password,
          user_metadata: {
            first_name,
            last_name,
            terms_accepted_at: acceptedAt,
            privacy_accepted_at: acceptedAt,
            ...(campaign ? { campaign_key: campaign } : {}),
          },
        });

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 400 }
        );
      }

      console.log(
        `[signup] resumed existing unverified user email=${email}`
      );
    } else {
      // Create the account with the password chosen by the user.
      // The email remains unverified until the OTP is completed.
      const { error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: {
            first_name,
            last_name,
            terms_accepted_at: acceptedAt,
            privacy_accepted_at: acceptedAt,
            ...(campaign ? { campaign_key: campaign } : {}),
          },
        });

      if (createError) {
        return NextResponse.json(
          { ok: false, error: createError.message },
          { status: 400 }
        );
      }

      const notifyResult = await sendSignupNotification({
        firstName: first_name,
        lastName: last_name,
        email,
        source,
      });

      console.log(
        `[signup] notification fired source=${source} email=${email} ok=${notifyResult.ok}`
      );
    }

    // This sends only the verification code. The password is never emailed.
    const { error: otpError } = await admin.auth.signInWithOtp({
      email,
    });

    if (otpError) {
      return NextResponse.json(
        { ok: false, error: otpError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Verification code sent",
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unexpected error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
