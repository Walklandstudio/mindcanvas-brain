"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

function formatRemaining(
  milliseconds: number
): string {
  const totalMinutes = Math.max(
    0,
    Math.ceil(
      milliseconds / 60000
    )
  );

  const days = Math.floor(
    totalMinutes / (24 * 60)
  );

  const hours = Math.floor(
    (totalMinutes % (24 * 60)) / 60
  );

  const minutes =
    totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export default function Founding100CountdownBanner({
  expiresAt,
  billingHref,
}: {
  expiresAt: string;
  billingHref: string;
}) {
  const [now, setNow] =
    useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    const timer =
      window.setInterval(() => {
        setNow(Date.now());
      }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const expiry =
    Date.parse(expiresAt);

  const remaining =
    now !== null &&
    Number.isFinite(expiry)
      ? expiry - now
      : null;

  if (
    remaining !== null &&
    remaining <= 0
  ) {
    return null;
  }

  return (
    <div className="border-b border-[#54AFE0]/20 bg-[#54AFE0]/10 px-5 py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs sm:text-sm">
        <span className="font-semibold text-white">
          Founding Member offer
        </span>

        <span className="text-white/35">
          ·
        </span>

        <span className="text-white/70">
          {remaining === null
            ? "7-day invitation active"
            : `${formatRemaining(
                remaining
              )} remaining`}
        </span>

        <span className="text-white/35">
          ·
        </span>

        <Link
          href={billingHref}
          className="font-semibold text-[#64bae2] transition hover:text-white"
        >
          Secure 70% off for life →
        </Link>
      </div>
    </div>
  );
}
