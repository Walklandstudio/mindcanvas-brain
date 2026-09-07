// apps/web/components/portal/create-test-link/StepSuccess.tsx
"use client";

import { useState } from "react";
import { getBaseUrl } from "@/lib/baseUrl";
import { darkInputClass } from "./AdvancedFields";

export default function StepSuccess({
  createdToken,
  copied,
  onCopy,
  orgId,
  orgSlug,
  testName,
  firstLinkOfferEligible,
}: {
  createdToken: string | null;
  copied: boolean;
  onCopy: () => void;
  orgId: string;
  orgSlug: string;
  testName?: string | null;
  firstLinkOfferEligible: boolean;
}) {
  const url = createdToken ? `${getBaseUrl()}/t/${createdToken}` : null;

  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const [claimingOffer, setClaimingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerDismissed, setOfferDismissed] = useState(false);

  const claimOffer = async () => {
    if (claimingOffer) return;

    setClaimingOffer(true);
    setOfferError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId,
          interval: "month",
          offer: "first-link-70",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok || !json?.url) {
        throw new Error(
          json?.error || "Could not start your discounted checkout.",
        );
      }

      window.location.href = json.url;
    } catch (error: unknown) {
      setOfferError(
        error instanceof Error
          ? error.message
          : "Could not start your discounted checkout.",
      );
      setClaimingOffer(false);
    }
  };

  const sendEmail = async () => {
    if (!url || !email.trim()) return;

    setSending(true);
    setEmailStatus(null);

    try {
      const res = await fetch("/api/portal/links/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          orgSlug,
          email: email.trim(),
          linkUrl: url,
          testName: testName || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.error) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setEmailStatus(
        json?.skipped
          ? "Email skipped — sending is not configured."
          : "Email sent!",
      );
      setEmail("");
    } catch (error: unknown) {
      setEmailStatus(
        error instanceof Error ? error.message : "Failed to send the email",
      );
    } finally {
      setSending(false);
    }
  };

  const showOffer = firstLinkOfferEligible && !offerDismissed;

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#22C55E]/[0.22] bg-[#22C55E]/10 text-[#22C55E]">
        {showOffer ? (
          <span className="text-[27px]" aria-hidden="true">
            🎉
          </span>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>

      <h3 className="mt-4 text-[17px] font-extrabold text-white">
        {showOffer
          ? "Congratulations! You've created your first test link"
          : "Test link created"}
      </h3>

      <p className="mt-1 max-w-[390px] text-[12.5px] font-light leading-5 text-white/[0.62]">
        {showOffer
          ? "Your link is ready to share."
          : "You can now activate, copy, and share your test links."}
      </p>

      {showOffer && (
        <div className="mt-5 w-full rounded-[16px] border border-[#54AFE0]/20 bg-[#54AFE0]/[0.07] p-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#54AFE0]">
            A little something to help you get started
          </p>

          <div className="mt-3 text-[30px] font-extrabold leading-none text-white">
            70% OFF
          </div>

          <p className="mt-2 text-[13px] leading-5 text-white/[0.72]">
            Upgrade your MindCanvas subscription and save 70% for your first{" "}
            <strong className="font-bold text-white">3 months</strong>.
          </p>

          <button
            type="button"
            onClick={claimOffer}
            disabled={claimingOffer}
            className="mt-4 inline-flex h-[42px] w-full items-center justify-center rounded-xl bg-[linear-gradient(101.83deg,#54AFE0_0%,#54AFE0_100%)] px-4 text-[13px] font-bold text-white shadow-[0_6px_20px_0_rgba(26,106,232,0.32)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claimingOffer
              ? "Preparing your discount…"
              : "Claim my 70% discount →"}
          </button>

          {offerError && (
            <p className="mt-2 text-[11.5px] text-rose-400">
              {offerError}
            </p>
          )}

          <button
            type="button"
            onClick={() => setOfferDismissed(true)}
            disabled={claimingOffer}
            className="mt-3 text-[11.5px] font-medium text-white/[0.5] transition hover:text-white/[0.8]"
          >
            No thanks — I’ll continue on the free trial
          </button>

          <p className="mt-3 text-[10.5px] leading-4 text-white/[0.38]">
            Monthly subscription. Discount applies to the first 3 months.
          </p>
        </div>
      )}

      {url && (
        <div
          className={`flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-3.5 pr-2.5 ${
            showOffer ? "mt-5" : "mt-5"
          }`}
        >
          <span className="truncate font-mono text-[11.5px] text-white/[0.62]">
            {url}
          </span>

          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-md border border-[#54AFE0]/[0.22] bg-[#54AFE0]/10 px-2.5 py-1 text-[10.5px] font-bold text-[#54AFE0] transition hover:bg-[#54AFE0]/20"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}

      {url && !showEmail && (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="mt-4 text-[12.5px] font-medium text-[#54AFE0] transition hover:text-white"
        >
          Send this link by email →
        </button>
      )}

      {url && showEmail && (
        <div className="mt-4 w-full text-left">
          <label
            className="mb-1.5 block text-[11px] font-semibold text-white/[0.62]"
            htmlFor="success-email"
          >
            Send to
          </label>

          <div className="flex gap-2">
            <input
              id="success-email"
              type="email"
              autoFocus
              placeholder="person@example.com"
              className={darkInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="button"
              disabled={sending || !email.trim()}
              onClick={sendEmail}
              className="shrink-0 rounded-xl border border-[#54AFE0]/[0.22] bg-[#54AFE0]/10 px-3.5 text-[12px] font-bold text-[#54AFE0] transition hover:bg-[#54AFE0]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>

          {emailStatus && (
            <p className="mt-1.5 text-[11.5px] text-white/[0.62]">
              {emailStatus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
