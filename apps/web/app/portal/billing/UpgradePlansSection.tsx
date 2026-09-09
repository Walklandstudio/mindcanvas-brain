"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type Props = {
  orgId: string;
  currentTier: number;
};

type UpgradePlan = {
  tier: 2 | 3;
  name: string;
  allowance: number;
  engines: string;
  unlocks: string;
};

const PLANS: UpgradePlan[] = [
  {
    tier: 2,
    name: "Pro",
    allowance: 10,
    engines: "Sales + Coaching",
    unlocks:
      "Unlock the MPS Coaching Engine",
  },
  {
    tier: 3,
    name: "Niche",
    allowance: 50,
    engines: "Sales + Coaching + People",
    unlocks:
      "Unlock the MindCanvas Alignment System (MCAS)",
  },
];

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 20;

export default function UpgradePlansSection({
  orgId,
  currentTier,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const [busyTier, setBusyTier] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] =
    useState(
      params.get("upgrade") === "processing",
    );

  const targetTierValue = Number(
    params.get("targetTier"),
  );

  const targetTier =
    Number.isInteger(targetTierValue) &&
    targetTierValue >= 2 &&
    targetTierValue <= 3
      ? targetTierValue
      : null;

  const eligiblePlans = PLANS.filter(
    (plan) => plan.tier > currentTier,
  );

  useEffect(() => {
    if (!confirming || targetTier === null) {
      return;
    }

    const expectedTier = targetTier;
    let cancelled = false;

    async function confirmUpgrade() {
      for (
        let attempt = 0;
        attempt < POLL_ATTEMPTS;
        attempt += 1
      ) {
        const response = await fetch(
          `/api/billing/summary?orgId=${encodeURIComponent(orgId)}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        const data = await response
          .json()
          .catch(() => null);

        const tier = Number(
          data?.billing?.tier,
        );

        if (
          response.ok &&
          data?.ok &&
          Number.isInteger(tier) &&
         tier >= expectedTier
        ) {
          if (cancelled) return;

          setConfirming(false);
          router.replace(
            `${window.location.pathname}?upgrade=success`,
          );
          router.refresh();
          return;
        }

        await new Promise((resolve) =>
          setTimeout(
            resolve,
            POLL_INTERVAL_MS,
          ),
        );

        if (cancelled) return;
      }

      if (!cancelled) {
        setConfirming(false);
        setError(
          "Stripe confirmed your request, but MindCanvas is still updating your access. Refresh this page in a moment.",
        );
      }
    }

    void confirmUpgrade();

    return () => {
      cancelled = true;
    };
  }, [
    confirming,
    orgId,
    router,
    targetTier,
  ]);

  async function startUpgrade(
    target: 2 | 3,
  ) {
    try {
      setBusyTier(target);
      setError("");

      const response = await fetch(
        "/api/billing/upgrade",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orgId,
            targetTier: target,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (
        !response.ok ||
        !data?.ok ||
        !data?.url
      ) {
        throw new Error(
          data?.error ||
            "Unable to start the upgrade.",
        );
      }

      window.location.assign(
        data.url as string,
      );
    } catch (upgradeError) {
      setError(
        upgradeError instanceof Error
          ? upgradeError.message
          : "Unable to start the upgrade.",
      );

      setBusyTier(null);
    }
  }

  if (
    currentTier >= 3 &&
    !confirming &&
    params.get("upgrade") !== "success"
  ) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-[#54AFE0]/25 bg-[#54AFE0]/[0.07] p-6 backdrop-blur">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#54AFE0]">
          Expand your platform
        </p>

        <h2 className="mt-2 text-lg font-semibold text-white">
          Unlock more MindCanvas engines
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Upgrade your existing subscription.
          Stripe will show the exact prorated
          amount before you confirm. Your
          existing usage and purchased bundles
          remain on the account.
        </p>
      </div>

      {params.get("upgrade") ===
        "success" && (
        <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
          Your plan has been upgraded and your
          additional engines are now available.
        </div>
      )}

      {confirming && (
        <div className="mt-5 rounded-2xl border border-[#54AFE0]/30 bg-[#06182a] px-5 py-4 text-sm text-white/70">
          Confirming your upgrade and unlocking
          your additional engines…
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {eligiblePlans.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {eligiblePlans.map((plan) => (
            <div
              key={plan.tier}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#06182a] p-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#54AFE0]">
                Tier {plan.tier}
              </p>

              <h3 className="mt-2 text-xl font-bold text-white">
                {plan.name}
              </h3>

              <p className="mt-2 text-sm text-white/60">
                {plan.engines}
              </p>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-white/70">
                <p>{plan.unlocks}</p>
                <p>
                  {plan.allowance} included
                  submissions per month
                </p>
              </div>

              <button
                type="button"
                disabled={
                  busyTier !== null ||
                  confirming
                }
                onClick={() =>
                  startUpgrade(plan.tier)
                }
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2d8fc4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#247baa] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyTier === plan.tier
                  ? "Opening secure upgrade…"
                  : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}