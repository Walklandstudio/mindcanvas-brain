// apps/web/app/portal/[slug]/tests/page.tsx
// Server component — Tests hub for /portal/[slug]/tests

import Link from "next/link";

import {
  getActiveEntitlement,
} from "@/app/_lib/billing";
import CreateTestLinkButton from "@/components/portal/CreateTestLinkButton";
import type { ModelOption } from "@/components/portal/CreateTestLinkModal";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import UpgradeEngineButton from "@/components/portal/UpgradeEngineButton";
import {
  cardClass,
} from "@/components/portal/ui";
import {
  loadModels,
} from "@/lib/portal/loadModels";
import {
  createClient,
} from "@/lib/server/supabaseAdmin";
import { metaFor } from "@/lib/testModels";

export const dynamic = "force-dynamic";

type LockedModel = ModelOption & {
  locked: true;
  requiredTier: 2 | 3;
  requiredPlan: "Pro" | "Growth";
  descriptionName: string;
};

const LOCKED_CATALOG: LockedModel[] = [
  {
    id: "locked-coaching-engine",
    name: "MPS Coaching Engine",
    category:
      "Predictive Coaching Intelligence",
    locked: true,
    requiredTier: 2,
    requiredPlan: "Pro",
    descriptionName: "MPS",
  },
  {
    id: "locked-people-engine",
    name:
      "MindCanvas Alignment System",
    category:
      "Predictive Team Design Intelligence",
    locked: true,
    requiredTier: 3,
    requiredPlan: "Growth",
    descriptionName: "MCAS",
  },
];

function isMcasModel(
  model: Pick<
    ModelOption,
    "name"
  >,
): boolean {
  return (
    /\bmcas\b|mindcanvas alignment|core alignment/i.test(
      model.name,
    )
  );
}

export default async function TestsPage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const { slug } = params;

  try {
    const sb =
      createClient().schema(
        "portal",
      );

    const {
      data: org,
      error: orgError,
    } = await sb
      .from("orgs")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (orgError || !org) {
      throw new Error(
        orgError?.message ||
          "Organisation not found",
      );
    }

    const [models, entitlement] =
      await Promise.all([
        loadModels(org.id),
        getActiveEntitlement(
          org.id,
        ),
      ]);

    const currentTier =
      entitlement?.status ===
      "active"
        ? entitlement.tier
        : null;

    const lockedModels =
      currentTier !== null &&
      currentTier >= 1 &&
      currentTier < 3
        ? LOCKED_CATALOG.filter(
            (model) =>
              model.requiredTier >
              currentTier,
          )
        : [];

    // MCAS is catalogue-only and uses its dedicated portal link builder.
    const modalModels: ModelOption[] =
      [
        ...models.filter(
          (model) =>
            !isMcasModel(model),
        ),
        ...lockedModels,
      ];

    return (
      <div className="space-y-6 text-slate-100">
        <PortalPageHeader
          title="Tests"
          subtitle="Create test links, manage models, and control how profiles are distributed."
          actions={
            <CreateTestLinkButton
              orgId={org.id}
              orgSlug={slug}
              models={modalModels}
              variant="header"
            />
          }
        />

        <div>
          <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-white/[0.36]">
            Available models
          </div>

          <div className="grid gap-x-2 gap-y-3.5 lg:grid-cols-2">
            {models.map(
              (model) => {
                const meta =
                  metaFor(
                    model.name,
                  );

                return (
                  <div
                    key={model.id}
                    className={`flex min-h-[254px] flex-col p-5 ${cardClass}`}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#54AFE0]">
                      {
                        meta.category
                      }
                    </div>

                    <h2 className="mt-2 text-[15px] font-extrabold leading-[20px] tracking-[-0.2px] text-white">
                      {model.name}
                    </h2>

                    <p className="mt-2.5 text-[12px] font-light leading-[18px] text-white/[0.62]">
                      {
                        meta.description
                      }
                    </p>

                    <div className="mt-3 space-y-2 border-t border-white/[0.05] pt-3.5">
                      <div className="flex text-[11px]">
                        <span className="w-[73px] shrink-0 font-semibold text-white/[0.36]">
                          Best for
                        </span>

                        <span className="font-light text-white/[0.62]">
                          {
                            meta.bestFor
                          }
                        </span>
                      </div>

                      <div className="flex text-[11px]">
                        <span className="w-[73px] shrink-0 font-semibold text-white/[0.36]">
                          Output
                        </span>

                        <span className="font-light text-white/[0.62]">
                          {
                            meta.output
                          }
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex justify-end pt-6">
                      {isMcasModel(
                        model,
                      ) ? (
                        <Link
                          href={`/portal/${slug}/mcas/links`}
                          className="inline-flex h-[24px] items-center rounded-md bg-[#54AFE0] px-[11px] text-[11px] font-semibold leading-none tracking-[0.1px] text-white shadow-[0_6px_20px_0_rgba(26,106,232,0.38)] transition-opacity hover:opacity-90"
                        >
                          Manage MCAS
                        </Link>
                      ) : (
                        <CreateTestLinkButton
                          orgId={
                            org.id
                          }
                          orgSlug={
                            slug
                          }
                          models={
                            modalModels
                          }
                          initialModelId={
                            model.id
                          }
                          variant="card"
                        />
                      )}
                    </div>
                  </div>
                );
              },
            )}

            {lockedModels.map(
              (model) => {
                const meta =
                  metaFor(
                    model.descriptionName,
                  );

                return (
                  <div
                    key={model.id}
                    className={`relative flex min-h-[254px] flex-col overflow-hidden p-5 ${cardClass}`}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[#06182a]/20 backdrop-blur-[0.6px]" />

                    <div className="relative flex h-full flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#54AFE0]/65">
                          {
                            meta.category
                          }
                        </div>

                        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#54AFE0]/25 bg-[#54AFE0]/10 px-2.5 py-1 text-[10px] font-bold text-[#8ed3f4]">
                          <span aria-hidden>
                            🔒
                          </span>

                          {
                            model.requiredPlan
                          }
                        </div>
                      </div>

                      <div className="opacity-55">
                        <h2 className="mt-2 text-[15px] font-extrabold leading-[20px] tracking-[-0.2px] text-white">
                          {
                            model.name
                          }
                        </h2>

                        <p className="mt-2.5 text-[12px] font-light leading-[18px] text-white/[0.62]">
                          {
                            meta.description
                          }
                        </p>

                        <div className="mt-3 space-y-2 border-t border-white/[0.05] pt-3.5">
                          <div className="flex text-[11px]">
                            <span className="w-[73px] shrink-0 font-semibold text-white/[0.36]">
                              Best for
                            </span>

                            <span className="font-light text-white/[0.62]">
                              {
                                meta.bestFor
                              }
                            </span>
                          </div>

                          <div className="flex text-[11px]">
                            <span className="w-[73px] shrink-0 font-semibold text-white/[0.36]">
                              Output
                            </span>

                            <span className="font-light text-white/[0.62]">
                              {
                                meta.output
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                        <p className="max-w-[210px] text-[11px] leading-4 text-white/50">
                          Upgrade to{" "}
                          {
                            model.requiredPlan
                          }{" "}
                          to unlock this
                          engine.
                        </p>

                        <UpgradeEngineButton
                          orgId={
                            org.id
                          }
                          targetTier={
                            model.requiredTier
                          }
                          planName={
                            model.requiredPlan
                          }
                          compact
                        />
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            {lockedModels.length ===
              0 && (
              <div
                className={`flex min-h-[254px] flex-col items-center justify-center p-5 text-center ${cardClass}`}
              >
                <p className="text-[11px] font-light leading-[16px] text-white/[0.36]">
                  More models coming
                  soon.
                </p>

                <p className="text-[11px] font-light leading-[16px] text-white/[0.36]">
                  Speak to us about
                  custom systems.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return (
      <div className="space-y-3 p-6 text-red-200">
        <h1 className="text-xl font-semibold">
          Tests page error
        </h1>

        <pre className="whitespace-pre-wrap rounded border border-red-700/40 bg-red-950/40 p-3 text-xs">
          {message}
        </pre>
      </div>
    );
  }
}
