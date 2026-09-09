"use client";

import {
  useEffect,
  useState,
} from "react";

export type Founding100Offer = {
  campaign_key: "founding_100";
  name: string;
  status:
    | "eligible"
    | "claimed"
    | "redeemed"
    | "expired";
  available: boolean;
  availability_reason: string | null;
  starts_at: string;
  expires_at: string;
  redeemed_at: string | null;
  target_tier: number;
  monthly_allowance_override:
    | number
    | null;
  engine_keys: string[];
  max_redemptions: number;
  redeemed_count: number;
  remaining_slots: number;
};

type BillingInterval =
  | "month"
  | "year";

function formatCountdown(
  milliseconds: number
): string {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000)
  );

  const days = Math.floor(
    totalSeconds / 86400
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

export default function Founding100OfferCard({
  orgId,
  offer,
}: {
  orgId: string;
  offer?: Founding100Offer | null;
}) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");

  const [
    addCertification,
    setAddCertification,
  ] = useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [now, setNow] =
    useState<number | null>(null);

  useEffect(() => {
    if (!offer) {
      return;
    }

    setNow(Date.now());

    const timer =
      window.setInterval(() => {
        setNow(Date.now());
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [offer]);

  if (!offer) {
    return null;
  }

  const allowance =
    offer.monthly_allowance_override ??
    35;

  if (offer.status === "redeemed") {
    return (
      <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/[0.08] p-6 backdrop-blur">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
          Founding Member
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white">
          Your 70% lifetime rate is secured
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
          Your Founding 100 membership is active.
          Your permanent Tier 2 Founding benefits
          remain attached to this organisation.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Benefit>
            {allowance} submissions every month
          </Benefit>

          <Benefit>
            Sales + Coaching Engines
          </Benefit>

          <Benefit>
            70% off Tier 2 for life
          </Benefit>
        </div>
      </section>
    );
  }

  if (!offer.available) {
    return null;
  }

  const expiresAt =
    Date.parse(offer.expires_at);

  const remainingMs =
    now !== null &&
    Number.isFinite(expiresAt)
      ? Math.max(
          0,
          expiresAt - now
        )
      : null;

  if (
    remainingMs !== null &&
    remainingMs <= 0
  ) {
    return null;
  }

  async function startCheckout() {
    try {
      setBusy(true);
      setError("");

      const response = await fetch(
        "/api/billing/checkout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orgId,
            tier: 2,
            interval:
              billingInterval,
            offer: "founding-100",
            addCertification,
          }),
        }
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
            "Unable to open secure Founding Member checkout."
        );
      }

      window.location.assign(
        data.url as string
      );
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to open secure Founding Member checkout."
      );

      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[#54AFE0]/35 bg-[#54AFE0]/[0.08] backdrop-blur">
      <div className="border-b border-white/10 bg-[#06182a]/70 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64bae2]">
            Founding 100 invitation
          </p>

          <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
            {remainingMs === null
              ? "7-day invitation"
              : `${formatCountdown(
                  remainingMs
                )} remaining`}
          </div>
        </div>
      </div>

      <div className="p-6">
        <h2 className="text-2xl font-semibold text-white">
          Become one of our first 100 Founding Members
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
          Profiletest.ai is growing its consultant
          community, and we're inviting our first
          100 consultants to join on a permanent
          founding rate.
        </p>

        <div className="mt-6 rounded-2xl border border-[#54AFE0]/25 bg-[#06182a] p-5">
          <p className="text-sm font-semibold text-[#64bae2]">
            Get 70% off Tier 2 for life
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Benefit>
              {allowance} test submissions every month
            </Benefit>

            <Benefit>
              Sales Engine profiling
            </Benefit>

            <Benefit>
              Coaching Engine profiling
            </Benefit>

            <Benefit>
              Monthly consultant training
            </Benefit>

            <Benefit>
              Monthly expert-led sessions
            </Benefit>

            <Benefit>
              Profiletest.ai consultant community
            </Benefit>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-white">
            Choose your Tier 2 billing cycle
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setBillingInterval(
                  "month"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                billingInterval ===
                "month"
                  ? "border-[#54AFE0] bg-[#54AFE0]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <p className="font-semibold text-white">
                Monthly
              </p>

              <p className="mt-1 text-xs text-white/50">
                70% Founding discount applied by Stripe
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setBillingInterval(
                  "year"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                billingInterval ===
                "year"
                  ? "border-[#54AFE0] bg-[#54AFE0]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <p className="font-semibold text-white">
                Annual
              </p>

              <p className="mt-1 text-xs text-white/50">
                70% Founding discount applied by Stripe
              </p>
            </button>
          </div>
        </div>

        <label className="mt-6 flex cursor-pointer gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <input
            type="checkbox"
            checked={
              addCertification
            }
            onChange={(event) =>
              setAddCertification(
                event.target.checked
              )
            }
            className="mt-1 h-4 w-4 accent-[#54AFE0]"
          />

          <span>
            <span className="block font-semibold text-white">
              Become a Certified Profiletest.ai Consultant
            </span>

            <span className="mt-1 block text-sm leading-6 text-white/55">
              Optional one-time certification add-on:
              {" "}
              <strong className="text-white">
                $997
              </strong>
              . The Founding discount does not apply
              to certification.
            </span>
          </span>
        </label>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={
              startCheckout
            }
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2d8fc4] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#247baa] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Opening secure checkout..."
              : "Secure my Founding Membership"}
          </button>

          <p className="text-xs leading-5 text-white/45">
            7-day invitation. Limited to the first
            100 paid Founding Members.
          </p>
        </div>

        <p className="mt-4 text-xs leading-5 text-white/40">
          Stripe will show the exact Tier 2 price
          and 70% lifetime discount before you pay.
        </p>
      </div>
    </section>
  );
}

function Benefit({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-white/70">
      <span className="mt-0.5 text-emerald-300">
        ✓
      </span>

      <span>{children}</span>
    </div>
  );
}
