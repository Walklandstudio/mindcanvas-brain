// apps/web/app/portal/[slug]/layout.tsx
import "server-only";

import type { CSSProperties, ReactNode } from "react";

import { getStripeMode } from "@/app/_lib/billing";
import {
  getAdminClient,
  getServerSupabase,
} from "@/app/_lib/portal";
import LegacyBillingCheckoutModal from "@/components/billing/LegacyBillingCheckoutModal";
import Founding100CountdownBanner from "@/components/portal/Founding100CountdownBanner";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalSidebar from "@/components/portal/PortalSidebar";
import BackgroundGrid from "@/components/ui/BackgroundGrid";
import {
  MCAS_TEST_SLUG,
  orgHasTestAccess,
} from "@/lib/portal/authz";
import { loadModels } from "@/lib/portal/loadModels";

import PilotGracePopup from "./PilotGracePopup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  slug: string;
};

type Org = {
  id: string;
  slug: string;
  name: string;
  brand_name?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
  brand_accent?: string | null;
  brand_text?: string | null;
  report_font_family?: string | null;
  report_font_size?: string | null;
  logo_url?: string | null;
};

type BillingAccount = {
  id: string;
  org_id: string;
  stripe_status: string | null;
  billing_source: string;
  billing_required_from: string | null;
};

type Founding100BannerOffer = {
  expires_at: string;
};

async function loadOrg(
  slug: string,
): Promise<Org | null> {
  try {
    const admin = await getAdminClient();

    const { data, error } = await admin
      .schema("portal")
      .from("orgs")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      console.error(
        "[portal-layout] Unable to load organisation:",
        {
          slug,
          error,
        },
      );

      return null;
    }

    return data as unknown as Org;
  } catch (error) {
    console.error(
      "[portal-layout] Organisation lookup failed:",
      {
        slug,
        error,
      },
    );

    return null;
  }
}

async function loadFounding100BannerOffer(
  org: Org,
): Promise<Founding100BannerOffer | null> {
  try {
    const admin =
      await getAdminClient();

    const {
      data: offer,
      error: offerError,
    } = await admin
      .schema("portal")
      .from("campaign_offers")
      .select(
        "status, expires_at, claim_expires_at",
      )
      .eq(
        "campaign_key",
        "founding_100",
      )
      .eq("org_id", org.id)
      .maybeSingle();

    if (offerError) {
      console.error(
        "[portal-layout] Unable to load Founding 100 offer:",
        {
          orgId: org.id,
          error: offerError,
        },
      );

      return null;
    }

    if (
      !offer ||
      !["eligible", "claimed"].includes(
        String(offer.status),
      )
    ) {
      return null;
    }

    const expiry = Date.parse(
      String(offer.expires_at),
    );

    if (
      !Number.isFinite(expiry) ||
      expiry <= Date.now()
    ) {
      return null;
    }

    const [
      campaignResult,
      redeemedResult,
    ] = await Promise.all([
      admin
        .schema("portal")
        .from("campaigns")
        .select(
          "status, max_redemptions",
        )
        .eq(
          "campaign_key",
          "founding_100",
        )
        .maybeSingle(),

      admin
        .schema("portal")
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
          ["redeemed", "claimed"],
        ),
    ]);

    if (
      campaignResult.error ||
      redeemedResult.error
    ) {
      console.error(
        "[portal-layout] Unable to load Founding 100 campaign availability:",
        {
          orgId: org.id,
          campaignError:
            campaignResult.error,
          redeemedError:
            redeemedResult.error,
        },
      );

      return null;
    }

    const campaign =
      campaignResult.data;

    if (
      !campaign ||
      campaign.status !== "active"
    ) {
      return null;
    }

    const now = Date.now();

    const reservedCount =
      (
        redeemedResult.data ?? []
      ).filter((row) => {
        if (
          row.status === "redeemed"
        ) {
          return true;
        }

        if (
          row.status !== "claimed" ||
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
      offer.claim_expires_at
        ? Date.parse(
            String(
              offer.claim_expires_at,
            ),
          )
        : NaN;

    const hasLiveOwnClaim =
      offer.status === "claimed" &&
      Number.isFinite(
        ownClaimExpiry,
      ) &&
      ownClaimExpiry > now;

    if (
      !hasLiveOwnClaim &&
      reservedCount >=
        campaign.max_redemptions
    ) {
      return null;
    }

    return {
      expires_at:
        String(offer.expires_at),
    };
  } catch (error) {
    console.error(
      "[portal-layout] Founding 100 banner lookup failed:",
      {
        orgId: org.id,
        error,
      },
    );

    return null;
  }
}

async function requiresLegacyBilling(
  org: Org,
): Promise<boolean> {
  try {
    const admin = await getAdminClient();

    const { data, error } = await admin
      .schema("portal")
      .from("billing_accounts")
      .select(
        [
          "id",
          "org_id",
          "stripe_status",
          "billing_source",
          "billing_required_from",
        ].join(","),
      )
      .eq("org_id", org.id)
      .eq("billing_type", "owner")
      .eq("billing_source", "legacy")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "[portal-layout] Unable to load legacy billing account:",
        {
          orgId: org.id,
          slug: org.slug,
          error,
        },
      );

      return false;
    }

    if (!data) {
      return false;
    }

    const billingAccount =
      data as unknown as BillingAccount;

    if (
      billingAccount.billing_required_from
    ) {
      const requiredFrom = Date.parse(
        billingAccount.billing_required_from,
      );

      if (
        !Number.isNaN(requiredFrom) &&
        requiredFrom > Date.now()
      ) {
        return false;
      }
    }

    const stripeStatus =
      billingAccount.stripe_status
        ?.trim()
        .toLowerCase() ?? "";

    const subscriptionIsActive =
      stripeStatus === "active" ||
      stripeStatus === "trialing";

    return !subscriptionIsActive;
  } catch (error) {
    console.error(
      "[portal-layout] Legacy billing check failed:",
      {
        orgId: org.id,
        slug: org.slug,
        error,
      },
    );

    return false;
  }
}

function getStripePublishableKey(): string {
  const stripeMode = getStripeMode();

  if (stripeMode === "live") {
    return (
      process.env
        .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
      ""
    );
  }

  return (
    process.env
      .NEXT_PUBLIC_SANDBOX_STRIPE_PUBLISHABLE_KEY ??
    process.env
      .SANDBOX_STRIPE_PUBLISHABLE_KEY ??
    process.env
      .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    ""
  );
}

function isMcasModelName(
  name: string,
): boolean {
  return (
    /\bmcas\b|mindcanvas alignment|core alignment/i.test(
      name,
    )
  );
}

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;

  const org = await loadOrg(slug);

  const mustCompleteLegacyBilling = org
    ? await requiresLegacyBilling(org)
    : false;

  const founding100BannerOffer =
    org && !mustCompleteLegacyBilling
      ? await loadFounding100BannerOffer(
          org,
        )
      : null;

  let firstName: string | null = null;
  let fullName: string | null = null;
  let avatarUrl: string | null = null;
  let isSuperadmin = false;

  try {
    const sb = await getServerSupabase();
    const { data } = await sb.auth.getUser();
    const user = data?.user ?? null;
    const meta = (user?.user_metadata ??
      {}) as Record<string, any>;

    const metaFull =
      [meta.first_name, meta.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      meta.full_name ||
      meta.name ||
      null;

    firstName =
      meta.first_name ||
      (metaFull
        ? metaFull.split(/\s+/)[0]
        : null);

    fullName = metaFull;

    avatarUrl =
      typeof meta.avatar_url === "string"
        ? meta.avatar_url
        : null;

    if (user?.id) {
      const admin =
        await getAdminClient();

      const { data: adminRow } =
        await admin
          .schema("portal")
          .from("superadmin")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      isSuperadmin = Boolean(
        adminRow?.user_id,
      );
    }
  } catch {
    // Header falls back to a generic greeting.
  }

  const [loadedModels, showMcas] =
    org
      ? await Promise.all([
          loadModels(org.id),
          orgHasTestAccess(
            org.id,
            MCAS_TEST_SLUG,
          ),
        ])
      : [[], false];

  // MCAS is catalogue-only in portal.tests and has its own link builder.
  const headerModels =
    loadedModels.filter(
      (model) =>
        !isMcasModelName(model.name),
    );

  const brandVariables = {
    "--brand-primary":
      org?.brand_primary ?? "#2d8fc4",
    "--brand-secondary":
      org?.brand_secondary ?? "#015a8b",
    "--brand-accent":
      org?.brand_accent ?? "#64bae2",
    "--brand-text":
      org?.brand_text ?? "#111827",
    "--report-font-family":
      org?.report_font_family ??
      "Inter, sans-serif",
    "--report-font-size":
      org?.report_font_size ?? "14px",
  } as CSSProperties;

  if (mustCompleteLegacyBilling) {
    return (
      <div
        style={brandVariables}
        className="relative min-h-screen overflow-x-hidden bg-[#020914] text-white"
      >
        <BackgroundGrid />

        <LegacyBillingCheckoutModal
          publishableKey={getStripePublishableKey()}
          organisationName={
            org?.brand_name ??
            org?.name ??
            slug
          }
        />
      </div>
    );
  }

  return (
    <div
      style={brandVariables}
      className="relative min-h-screen overflow-x-hidden bg-[#050914] text-white"
    >
      <BackgroundGrid />

      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/2 -z-10 h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 rotate-[-12.49deg] opacity-[0.65] [filter:blur(18px)]"
        style={{
          background:
            "linear-gradient(90deg, rgba(1,90,139,0) 0%, rgba(1,90,139,0.4) 25%, rgba(45,143,196,0.533) 50%, rgba(100,186,226,0.4) 75%, rgba(100,186,226,0) 100%)",
        }}
      />

      <div
        className="relative z-10 flex min-h-screen"
        style={{
          fontFamily:
            "var(--report-font-family)",
        }}
      >
        <div className="hidden md:block">
          <PortalSidebar
            orgSlug={slug}
            showMcas={showMcas}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <PortalHeader
            orgSlug={slug}
            orgId={org?.id ?? ""}
            models={headerModels}
            firstName={firstName}
            fullName={fullName}
            avatarUrl={avatarUrl}
            isSuperadmin={isSuperadmin}
          />

          {founding100BannerOffer && (
            <Founding100CountdownBanner
              expiresAt={
                founding100BannerOffer.expires_at
              }
              billingHref={`/portal/${slug}/billing`}
            />
          )}

          <div className="px-5 pb-10 pt-4">
            {children}
          </div>
        </div>
      </div>

      <PilotGracePopup />
    </div>
  );
}
