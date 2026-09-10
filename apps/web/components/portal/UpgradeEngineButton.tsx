"use client";

import { useState } from "react";

type Props = {
  orgId: string;
  targetTier: 2 | 3;
  planName: "Pro" | "Growth";
  compact?: boolean;
};

export default function UpgradeEngineButton({
  orgId,
  targetTier,
  planName,
  compact = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upgrade() {
    try {
      setBusy(true);
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
            targetTier,
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

      setBusy(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "flex flex-col items-end"
          : "w-full"
      }
    >
      <button
        type="button"
        onClick={upgrade}
        disabled={busy}
        className={
          compact
            ? "inline-flex h-[28px] items-center justify-center rounded-lg bg-[#2d8fc4] px-3 text-[11px] font-bold text-white transition hover:bg-[#247baa] disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#2d8fc4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#247baa] disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {busy
          ? "Opening upgrade…"
          : `Upgrade to ${planName}`}
      </button>

      {error && (
        <p className="mt-2 max-w-[260px] text-right text-[11px] leading-4 text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}