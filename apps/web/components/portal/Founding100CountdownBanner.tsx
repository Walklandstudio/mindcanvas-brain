// apps/web/components/portal/Founding100CountdownBanner.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function getRemainingParts(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return {
    days,
    hours,
    minutes,
  };
}

function TimerTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[76px] rounded-2xl border border-[#ff5a86]/45 bg-[#120814] px-3 py-2 text-center shadow-[0_0_18px_rgba(255,73,118,0.45),inset_0_0_18px_rgba(255,73,118,0.08)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff9ab5]">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-extrabold leading-none text-[#ff5a86] [text-shadow:0_0_12px_rgba(255,90,134,0.8)]">
        {String(value).padStart(2, "0")}
      </div>
    </div>
  );
}

export default function Founding100CountdownBanner({
  expiresAt,
  billingHref,
}: {
  expiresAt: string;
  billingHref: string;
}) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const expiry = Date.parse(expiresAt);
  const remaining =
    Number.isFinite(expiry) ? expiry - now : null;

  const countdown = useMemo(
    () =>
      remaining !== null && remaining > 0
        ? getRemainingParts(remaining)
        : null,
    [remaining],
  );

  if (remaining !== null && remaining <= 0) {
    return null;
  }

  return (
    <div className="border-b border-[#ff5a86]/20 bg-[radial-gradient(circle_at_top,rgba(255,73,118,0.18),transparent_40%),linear-gradient(180deg,#0a1320_0%,#0a0f18_100%)] px-5 py-4 shadow-[0_0_35px_rgba(255,73,118,0.10)]">
      <div className="flex flex-col items-center justify-between gap-4 xl:flex-row">
        <div className="text-center xl:text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff9ab5]">
            Founding Member offer
          </p>

          <h3 className="mt-1 text-lg font-extrabold text-white">
            Secure 70% off Tier 2 for life
          </h3>

          <p className="mt-1 text-sm text-white/70">
            35 monthly submissions · Sales + Coaching · First 100 paid members
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            {countdown ? (
              <>
                <TimerTile label="Days" value={countdown.days} />
                <TimerTile label="Hrs" value={countdown.hours} />
                <TimerTile label="Min" value={countdown.minutes} />
              </>
            ) : (
              <div className="rounded-2xl border border-[#ff5a86]/45 bg-[#120814] px-5 py-3 text-sm font-semibold text-[#ff5a86] shadow-[0_0_18px_rgba(255,73,118,0.45),inset_0_0_18px_rgba(255,73,118,0.08)]">
                7-day invitation active
              </div>
            )}
          </div>

          <Link
            href={billingHref}
            className="inline-flex h-[46px] items-center justify-center rounded-xl border border-[#54AFE0]/40 bg-[linear-gradient(180deg,rgba(84,175,224,0.28),rgba(84,175,224,0.12))] px-5 text-sm font-bold text-[#8dd7ff] shadow-[0_0_20px_rgba(84,175,224,0.22)] transition hover:border-[#8dd7ff]/60 hover:text-white"
          >
            Secure 70% off for life →
          </Link>
        </div>
      </div>
    </div>
  );
}
