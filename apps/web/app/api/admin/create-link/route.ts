//apps/web/app/api/admin/create-link/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import { Resend } from "resend";
import crypto from "crypto";
import {
  normalizeMaxUses,
  normalizeReportVariant,
} from "@/lib/links/normalize";
import { createLinkSchema, formatZodError } from "@/lib/links/schema";
import { requireOrgAccess } from "@/lib/server/orgAccess";

export const runtime = "nodejs";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  process.env.RESEND_FROM ||
  "no-reply@mindcanvas.app";

function absoluteUrl(path: string) {
  const host =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const base = host.startsWith("http") ? host : `https://${host}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);

    const parsed = createLinkSchema.safeParse(raw ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const body = parsed.data;

    const {
      orgId,
      testId,
      testDisplayName,
      contactOwner,
      showResults,
      emailReport,
      hiddenResultsMessage,
      redirectUrl,
      nextStepsUrl,
      expiresAt,
      recipientEmail,
      recipientName,
    } = body;

    // Links are created with the service-role client, so membership of the
    // target org is checked here rather than relying on RLS.
    const access = await requireOrgAccess(orgId);
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: access.status },
      );
    }

    const reportVariant = normalizeReportVariant(
      body.report_variant ?? body.reportVariant,
    );

    const maxUses = normalizeMaxUses(body.max_uses);

    const sb = createClient().schema("portal");

    // Enforce the same permission used by the test dropdown.
    const { data: testRow, error: testErr } = await sb
      .from("tests")
      .select("id, org_id, status")
      .eq("id", testId)
      .maybeSingle();

    if (testErr) {
      return NextResponse.json(
        { ok: false, error: testErr.message },
        { status: 500 },
      );
    }

    if (!testRow) {
      return NextResponse.json(
        { ok: false, error: "Test not found" },
        { status: 404 },
      );
    }

    if (testRow.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "This test is not active" },
        { status: 403 },
      );
    }

    let hasTestAccess = testRow.org_id === orgId;

    if (!hasTestAccess) {
      const { data: billingAccount, error: billingErr } = await sb
        .from("billing_accounts")
        .select("billing_source")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (billingErr) {
        return NextResponse.json(
          { ok: false, error: billingErr.message },
          { status: 500 },
        );
      }

      const isLegacyBilling = billingAccount?.billing_source === "legacy";

      const { data: accessRow, error: accessErr } = await sb
        .from("user_test_access")
        .select("test_id")
        .eq("org_id", orgId)
        .eq("test_id", testId)
        .limit(1)
        .maybeSingle();

      if (accessErr) {
        return NextResponse.json(
          { ok: false, error: accessErr.message },
          { status: 500 },
        );
      }

      hasTestAccess = Boolean(accessRow);

      // Modern billing grants tests through org_test_access. Legacy billing
      // deliberately ignores tier-wide access and preserves explicit tests.
      if (!hasTestAccess && !isLegacyBilling) {
        const { data: orgAccessRow, error: orgAccessErr } = await sb
          .from("org_test_access")
          .select("test_id")
          .eq("org_id", orgId)
          .eq("test_id", testId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (orgAccessErr) {
          return NextResponse.json(
            { ok: false, error: orgAccessErr.message },
            { status: 500 },
          );
        }

        hasTestAccess = Boolean(orgAccessRow);
      }
    }

    if (!hasTestAccess) {
      return NextResponse.json(
        {
          ok: false,
          error: "This organisation does not have access to this test",
        },
        { status: 403 },
      );
    }

    const { count: existingLinkCount, error: existingLinkCountErr } = await sb
      .from("test_links")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (existingLinkCountErr) {
      return NextResponse.json(
        { ok: false, error: existingLinkCountErr.message },
        { status: 500 },
      );
    }

    const isFirstEverLink = (existingLinkCount ?? 0) === 0;

    const token = crypto.randomUUID().replace(/-/g, "");

    const insertPayload: any = {
      token,
      org_id: orgId,
      test_id: testId,
      name: testDisplayName || null,
      contact_owner: contactOwner || null,
      show_results: !!showResults,
      email_report: !!emailReport,
      is_active: true,

      hidden_results_message: showResults ? null : hiddenResultsMessage || null,
      redirect_url: showResults ? null : redirectUrl || null,

      // Keep this available on the link either way.
      next_steps_url: nextStepsUrl || null,

      max_uses: maxUses,

      meta: {
        report_variant: reportVariant,
        report_paywall_enabled: !!body.reportPaywallEnabled,
        report_price_cents: body.reportPaywallEnabled ? body.reportPriceCents : null,
        report_currency: (body.reportCurrency || "GBP").toLowerCase(),
      },
    };

    if (expiresAt) {
      insertPayload.expires_at = new Date(expiresAt).toISOString();
    }

    const { data: linkRow, error: insErr } = await sb
      .from("test_links")
      .insert(insertPayload)
      .select("token, show_results, redirect_url, next_steps_url, meta")
      .single();

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: insErr.message },
        { status: 500 },
      );
    }

    const publicUrl = absoluteUrl(`/t/${linkRow.token}`);

    let founding100OfferEligible = false;

    if (isFirstEverLink) {
      try {
        const {
          data: campaignOffer,
          error: campaignOfferError,
        } = await sb
          .from("campaign_offers")
          .select(
            "status, expires_at, claim_expires_at",
          )
          .eq(
            "campaign_key",
            "founding_100",
          )
          .eq("org_id", orgId)
          .maybeSingle();

        if (campaignOfferError) {
          throw campaignOfferError;
        }

        if (
          campaignOffer &&
          ["eligible", "claimed"].includes(
            String(campaignOffer.status),
          )
        ) {
          const offerExpiry = Date.parse(
            String(
              campaignOffer.expires_at,
            ),
          );

          const now = Date.now();

          if (
            Number.isFinite(
              offerExpiry,
            ) &&
            offerExpiry > now
          ) {
            const [
              campaignResult,
              reservedResult,
            ] = await Promise.all([
              sb
                .from("campaigns")
                .select(
                  "status, max_redemptions",
                )
                .eq(
                  "campaign_key",
                  "founding_100",
                )
                .maybeSingle(),

              sb
                .from("campaign_offers")
                .select(
                  "status, claim_expires_at",
                )
                .eq(
                  "campaign_key",
                  "founding_100",
                )
                .in(
                  "status",
                  [
                    "redeemed",
                    "claimed",
                  ],
                ),
            ]);

            if (campaignResult.error) {
              throw campaignResult.error;
            }

            if (reservedResult.error) {
              throw reservedResult.error;
            }

            const campaign =
              campaignResult.data;

            if (
              campaign &&
              campaign.status === "active"
            ) {
              const reservedCount =
                (
                  reservedResult.data ?? []
                ).filter((row) => {
                  if (
                    row.status ===
                    "redeemed"
                  ) {
                    return true;
                  }

                  if (
                    row.status !==
                      "claimed" ||
                    !row.claim_expires_at
                  ) {
                    return false;
                  }

                  const claimExpiry =
                    Date.parse(
                      row.claim_expires_at,
                    );

                  return (
                    Number.isFinite(
                      claimExpiry,
                    ) &&
                    claimExpiry > now
                  );
                }).length;

              const ownClaimExpiry =
                campaignOffer
                  .claim_expires_at
                  ? Date.parse(
                      String(
                        campaignOffer
                          .claim_expires_at,
                      ),
                    )
                  : NaN;

              const hasLiveOwnClaim =
                campaignOffer.status ===
                  "claimed" &&
                Number.isFinite(
                  ownClaimExpiry,
                ) &&
                ownClaimExpiry > now;

              founding100OfferEligible =
                hasLiveOwnClaim ||
                reservedCount <
                  campaign.max_redemptions;
            }
          }
        }
      } catch (offerError) {
        // Never break successful test-link creation because the optional
        // Founding 100 conversion offer could not be evaluated.
        console.error(
          "Founding 100 first-link eligibility failed",
          offerError,
        );
      }
    }

    let emailResult: any = null;
    let emailError: string | null = null;

    if (recipientEmail) {
      if (!RESEND_API_KEY) {
        emailError = "Missing RESEND_API_KEY or EMAIL_FROM env vars.";
      } else {
        try {
          const resend = new Resend(RESEND_API_KEY);
          const to = recipientName?.trim()
            ? `${recipientName} <${recipientEmail}>`
            : recipientEmail;

          const subject = testDisplayName
            ? `Your ${testDisplayName} link`
            : "Your MindCanvas test link";

          const html = `
            <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6;">
              <h2 style="margin:0 0 12px;">You're invited to take a MindCanvas profile test</h2>
              ${
                contactOwner
                  ? `<p>Contact owner: <strong>${escapeHtml(
                      contactOwner,
                    )}</strong></p>`
                  : ""
              }
              <p>Click below to start:</p>
              <p style="margin:16px 0;">
                <a href="${publicUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Start your test</a>
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#666;">
                If the button doesn't work, copy this link:<br/>${publicUrl}
              </p>
            </div>
          `;

          emailResult = await resend.emails.send({
            from: EMAIL_FROM,
            to,
            subject,
            html,
          });
        } catch (e: any) {
          emailError = e?.message || "Email send failed.";
        }
      }
    }

    return NextResponse.json({
      ok: true,
      token: linkRow.token,
      url: publicUrl,
      show_results: linkRow.show_results,
      redirect_url: linkRow.redirect_url,
      next_steps_url: linkRow.next_steps_url,
      report_variant:
        linkRow?.meta?.report_variant === "lite" ? "lite" : "full",
      emailed: !!recipientEmail && !emailError,
      emailResultId: emailResult?.id ?? null,
      emailError,
      founding100OfferEligible,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}