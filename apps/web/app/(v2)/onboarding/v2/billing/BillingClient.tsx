"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepCard } from "../_components/StepCard";
import { ORGANISATION_PATH } from "../_lib/progress";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type BillingTier = { tier: number; name: string; tagline: string; amountCents: number };

const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 20;

type BillingInterval = "month" | "year";

async function startCheckout(
  interval: BillingInterval,
  orgId: string | null,
  tier: number | null
): Promise<string> {
  const body: {
    flow: "onboarding";
    interval: BillingInterval;
    orgId?: string;
    tier?: number;
  } = { flow: "onboarding", interval };

  if (orgId) body.orgId = orgId;
  if (tier !== null) body.tier = tier;

  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!json?.ok || !json.url) throw new Error(json?.error || "Could not start checkout.");
  return json.url as string;
}

export function BillingClient(_: { tiers: BillingTier[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status");
  const interval: BillingInterval =
    params.get("interval") === "year" ? "year" : "month";
  const orgId = params.get("orgId")?.trim() || null;
  const tierValue = Number(params.get("tier"));
  const tier =
    Number.isInteger(tierValue) && tierValue >= 1 && tierValue <= 4
      ? tierValue
      : null;

  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const initiated = useRef(false);
  const confirmStarted = useRef(false);

  const confirmPayment = useCallback(async () => {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      const summaryUrl = orgId
        ? `/api/billing/summary?orgId=${encodeURIComponent(orgId)}`
        : "/api/billing/summary";
      const res = await fetch(summaryUrl, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      const active =
        json?.ok &&
        json.billing?.stripe_status === "active" &&
        json.billing?.is_pilot === false;
      if (active) {
       router.replace(ORGANISATION_PATH);
       return;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    setError(
      "Your payment went through but we are still waiting for confirmation. Refresh this page in a moment."
    );
  }, [router, orgId]);

  useEffect(() => {
    if (status === "success") {
      if (confirmStarted.current) return;
      confirmStarted.current = true;
      void confirmPayment();
      return;
    }
    if (status === "cancelled") return;
    if (initiated.current) return;
    initiated.current = true;
    startCheckout(interval, orgId, tier)
      .then((url) => { window.location.href = url; })
      .catch((e: Error) => setError(e.message));
  }, [status, interval, orgId, tier, confirmPayment]);

  const retry = () => {
    setError("");
    setRetrying(true);
    startCheckout(interval, orgId, tier)
      .then((url) => { window.location.href = url; })
      .catch((e: Error) => { setError(e.message); setRetrying(false); });
  };

  if (status === "success") {
    return (
      <StepCard
        titleNoWrap={false}
        title={
          <>
            Confirming your{" "}
            <span style={{ color: "rgb(84, 175, 224)" }}>subscription</span>
          </>
        }
        subtitle="This only takes a moment."
      >
        <div className="mt-10 text-center text-white/70">
          {error ? (
            <p className="text-rose-400">{error}</p>
          ) : (
            <p>Waiting for Stripe to confirm your payment…</p>
          )}
        </div>
      </StepCard>
    );
  }

  if (status === "cancelled") {
    return (
      <StepCard
        titleNoWrap={false}
        title={
          <>
            Payment{" "}
            <span style={{ color: "rgb(84, 175, 224)" }}>cancelled</span>
          </>
        }
        subtitle="Your plan is saved. Retry when you're ready."
      >
        <div className="mt-10 text-center">
          {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className={`h-[52px] px-8 rounded-[12px] text-white font-bold tracking-wide ${
              retrying ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            }`}
            style={{
              background:
                "linear-gradient(180deg, rgb(6,94,144) 0%, rgb(42,137,190) 100%)",
              fontSize: "15px",
              boxShadow: "0px 4px 16px 0px rgba(37,99,200,0.35)",
            }}
          >
            {retrying ? "Redirecting…" : "Proceed to payment"}
          </button>
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard
      titleNoWrap={false}
      title={
        <>
          Setting up your{" "}
          <span style={{ color: "rgb(84, 175, 224)" }}>payment</span>
        </>
      }
      subtitle="You will be redirected to Stripe in a moment."
    >
      <div className="mt-10 text-center text-white/70">
        {error ? (
          <>
            <p className="text-rose-400 mb-4">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="text-sm underline"
              style={{ color: "rgb(84,175,224)" }}
            >
              Try again
            </button>
          </>
        ) : (
          <p>Preparing checkout…</p>
        )}
      </div>
    </StepCard>
  );
}