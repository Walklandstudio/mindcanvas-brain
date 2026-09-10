"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, isErr } from "../_lib/api";
import {
  BILLING_PATH,
  ORGANISATION_PATH,
} from "../_lib/progress";
import {
  ENGINES,
  ENGINE_LIST,
  FREE_TRIAL_TEST_SUBMISSIONS,
  FREE_TRIAL_TIER,
  engineListLabel,
  enginesForTier,
  freeTrialEngines,
} from "../_lib/engines";
import { StepCard } from "../_components/StepCard";
import { EngineCard } from "./EngineCard";
import { FreeTrialCard } from "./FreeTrialCard";
import {
  TierCard,
  type BillingInterval,
  type TierCardData,
} from "./TierCard";

const ACCENT = "rgb(84,175,224)";
const SUMMARY_LABEL = "rgba(230,240,250,0.62)";
const SUMMARY_VALUE = "rgb(234,242,251)";

const PLAN_TAGLINES: Record<string, string> = {
  Starter:
    "For independent consultants and coaches ready to sell smarter.",
  Pro:
    "For growing service businesses scaling their sales and delivery.",
  Growth:
    "For niche experts building authority and licensing their IP.",
};

type PlanChoice = "trial" | number | null;
type PendingAction = "trial" | "paid" | null;

function formatUsd(cents: number): string {
  const major = cents / 100;

  return `${
    Number.isInteger(major)
      ? `$${major}`
      : `$${major.toFixed(2)}`
  }`;
}

export function PlanClient({
  cards,
}: {
  cards: TierCardData[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const orgId = params.get("orgId")?.trim() || null;

  const [choice, setChoice] =
    useState<PlanChoice>(null);

  const [interval, setInterval] =
    useState<BillingInterval>("month");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [pending, setPending] =
    useState<PendingAction>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const response =
        await api.getPlanSelection();

      if (cancelled) return;

      if (
        !isErr(response) &&
        response.selection &&
        cards.some(
          (card) =>
            card.tier ===
            response.selection?.tier
        )
      ) {
        setChoice(response.selection.tier);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [cards]);

  const isTrial = choice === "trial";

  const activeCard =
    typeof choice === "number"
      ? cards.find(
          (card) => card.tier === choice
        ) ?? null
      : null;

  const selectedTier = isTrial
    ? FREE_TRIAL_TIER
    : activeCard?.tier ?? null;

  const selectedEngines = isTrial
    ? freeTrialEngines()
    : selectedTier
      ? enginesForTier(selectedTier)
      : [];

  const planName = isTrial
    ? "Free Trial"
    : activeCard?.name ?? "";

  const planTagline = isTrial
    ? "Explore the Growth Engine Diagnostic before choosing a paid plan."
    : activeCard
      ? PLAN_TAGLINES[activeCard.name] ??
        activeCard.tagline
      : "";

  const planPrice = isTrial
    ? "$0"
    : activeCard
      ? formatUsd(
          interval === "year"
            ? activeCard.annualAmountCents
            : activeCard.monthlyAmountCents
        )
      : "";

  const planPeriod =
    interval === "year" ? "year" : "month";

  const canContinue =
    pending === null &&
    (isTrial || activeCard !== null);

  function selectFreeTrial() {
    setError("");
    setChoice("trial");
  }

  function selectPaidPlan(tier: number) {
    setError("");
    setChoice(tier);
  }

  async function saveTier(
    tier: number
  ): Promise<boolean> {
    const response =
      await api.savePlanSelection({ tier });

    if (isErr(response)) {
      setError(response.error);
      return false;
    }

    return true;
  }

  async function onContinue() {
    if (!canContinue) return;

    setError("");

    if (isTrial) {
      setPending("trial");

      if (!(await saveTier(FREE_TRIAL_TIER))) {
        setPending(null);
        return;
      }

      const response = await api.skipBilling();

      if (isErr(response)) {
        setError(response.error);
        setPending(null);
        return;
      }

      router.push(ORGANISATION_PATH);
      return;
    }

    if (!activeCard) {
      setError(
        "Please select a Free Trial or paid plan."
      );
      return;
    }

    setPending("paid");

    if (!(await saveTier(activeCard.tier))) {
      setPending(null);
      return;
    }

    const billingParams = new URLSearchParams({
      interval,
      tier: String(activeCard.tier),
    });

    if (orgId) {
      billingParams.set("orgId", orgId);
    }

    router.push(`${BILLING_PATH}?${billingParams.toString()}`);
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-white/70">
        Loading…
      </div>
    );
  }

  return (
    <StepCard
      width="100%"
      minHeight="auto"
      titleNoWrap={false}
      className="lg:px-[80px] lg:pt-[31px]"
      title={
        <>
          Choose your{" "}
          <span style={{ color: ACCENT }}>
            MindCanvas
          </span>{" "}
          plan
        </>
      }
      subtitle={
        <span className="mx-auto block max-w-[680px]">
          Review the MindCanvas engines below, then
          choose a Free Trial or paid plan. Engine
          access is assigned automatically from the
          option you select.
        </span>
      }
    >
      <section className="mt-10">
        <div className="mb-5">
          <h2
            className="text-[18px] font-semibold leading-[24px]"
            style={{ color: SUMMARY_VALUE }}
          >
            Explore the MindCanvas engines
          </h2>

          <p
            className="mt-1 text-[13px] leading-[20px]"
            style={{ color: SUMMARY_LABEL }}
          >
            These cards explain each engine. You do not
            need to select an engine separately.
          </p>
        </div>

        <div className="grid gap-[18px] md:grid-cols-2 lg:grid-cols-3">
          {ENGINE_LIST.map((engine) => (
            <EngineCard
              key={engine.key}
              engine={engine}
            />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              className="text-[18px] font-semibold leading-[24px]"
              style={{ color: SUMMARY_VALUE }}
            >
              Choose how you would like to get started
            </h2>

            <p
              className="mt-1 text-[13px] leading-[20px]"
              style={{ color: SUMMARY_LABEL }}
            >
              Start with three free GED submissions or
              choose a paid subscription.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-[12px] font-medium"
              style={{
                color:
                  interval === "month"
                    ? SUMMARY_VALUE
                    : "rgba(210,225,245,0.38)",
              }}
            >
              Monthly
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={interval === "year"}
              aria-label="Toggle annual billing"
              onClick={() =>
                setInterval((current) =>
                  current === "month"
                    ? "year"
                    : "month"
                )
              }
              className="relative h-6 w-[42px] cursor-pointer rounded-full transition-colors"
              style={{
                background:
                  interval === "year"
                    ? ACCENT
                    : "rgb(30,58,85)",
              }}
            >
              <span
                className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-[left] duration-200 ${
                  interval === "year"
                    ? "left-[20px]"
                    : "left-[2px]"
                }`}
              />
            </button>

            <span
              className="flex items-center gap-2 text-[12px] font-medium"
              style={{
                color:
                  interval === "year"
                    ? SUMMARY_VALUE
                    : "rgba(210,225,245,0.38)",
              }}
            >
              Annual

              <span
                className="rounded-full px-2 py-[2px] text-[9px] font-bold uppercase"
                style={{
                  background:
                    "rgba(34,197,94,0.10)",
                  color: "rgb(34,197,94)",
                }}
              >
                2 months free
              </span>
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-[15px] sm:grid-cols-2 xl:grid-cols-4">
          <FreeTrialCard
            selected={isTrial}
            onSelect={selectFreeTrial}
          />

          {cards.map((card) => (
            <TierCard
              key={card.tier}
              card={card}
              selected={
                typeof choice === "number" &&
                choice === card.tier
              }
              recommended={Boolean(card.highlight)}
              disabled={false}
              interval={interval}
              onSelect={() =>
                selectPaidPlan(card.tier)
              }
            />
          ))}
        </div>
      </section>

      <section
        className="mt-8 rounded-[12px] border p-6"
        style={{
          background: "rgb(15,32,53)",
          borderColor: "rgba(255,255,255,0.09)",
        }}
      >
        {choice === null ? (
          <p
            className="text-center text-[13px] leading-[20px]"
            style={{
              color: "rgba(210,225,245,0.48)",
            }}
          >
            Select a Free Trial or paid plan to
            continue.
          </p>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 lg:max-w-[720px]">
              <div className="flex flex-wrap gap-[7px]">
                {selectedEngines.map((key) => (
                  <span
                    key={key}
                    className="rounded-full px-[10px] py-[4px] text-[10px] font-bold uppercase leading-[12px]"
                    style={{
                      background:
                        "rgba(84,175,224,0.10)",
                      color: ACCENT,
                    }}
                  >
                    {ENGINES[key].name}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3
                  className="text-[20px] font-semibold leading-[26px]"
                  style={{ color: SUMMARY_VALUE }}
                >
                  MindCanvas {planName}
                </h3>

                <p className="flex items-baseline gap-[3px]">
                  <span
                    className="text-[22px] font-bold leading-[27px]"
                    style={{ color: SUMMARY_VALUE }}
                  >
                    {planPrice}
                  </span>

                  {!isTrial && (
                    <span
                      className="text-[12px]"
                      style={{
                        color:
                          "rgba(210,225,245,0.48)",
                      }}
                    >
                      /{planPeriod}
                    </span>
                  )}
                </p>
              </div>

              <p
                className="mt-1 text-[13px] leading-[20px]"
                style={{ color: SUMMARY_LABEL }}
              >
                {planTagline}
              </p>

              <p
                className="mt-3 text-[13px] leading-[20px]"
                style={{ color: SUMMARY_LABEL }}
              >
                Engine access:{" "}
                <span style={{ color: SUMMARY_VALUE }}>
                  {engineListLabel(selectedEngines)}
                </span>
              </p>

              {isTrial && (
                <p
                  className="mt-1 text-[13px] leading-[20px]"
                  style={{ color: SUMMARY_LABEL }}
                >
                  Trial allowance:{" "}
                  <span
                    style={{ color: SUMMARY_VALUE }}
                  >
                    {FREE_TRIAL_TEST_SUBMISSIONS} GED
                    submissions with no expiry date.
                    A paid plan is required once they
                    have been used.
                  </span>
                </p>
              )}
            </div>

            <div className="w-full lg:w-[360px] lg:shrink-0">
              {error && (
                <p className="mb-3 text-[13px] leading-[20px] text-rose-400">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={onContinue}
                disabled={!canContinue}
                className={`flex h-[52px] w-full items-center justify-center rounded-[12px] text-[15px] font-bold tracking-[0.2px] text-white transition ${
                  canContinue
                    ? "cursor-pointer hover:brightness-105"
                    : "cursor-not-allowed opacity-40"
                }`}
                style={{
                  background: "rgb(107,178,222)",
                }}
              >
                {pending === "trial"
                  ? "Setting up your trial…"
                  : pending === "paid"
                    ? "Redirecting to checkout…"
                    : isTrial
                      ? "Start Free Trial"
                      : `Continue to checkout — ${planPrice}`}
              </button>

              <p
                className="mt-2 text-center text-[11.5px] leading-[17px]"
                style={{
                  color: "rgba(210,225,245,0.42)",
                }}
              >
                {isTrial
                  ? "No payment details are required."
                  : "Secure payment is completed through Stripe."}
              </p>
            </div>
          </div>
        )}
      </section>
    </StepCard>
  );
}