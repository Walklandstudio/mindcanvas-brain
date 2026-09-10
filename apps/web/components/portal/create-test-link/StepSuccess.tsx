// apps/web/components/portal/create-test-link/StepSuccess.tsx
"use client";

import { useState } from "react";
import { getBaseUrl } from "@/lib/baseUrl";
import { darkInputClass } from "./AdvancedFields";

function OfferPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#06182a] px-3 py-2 text-left text-[11.5px] leading-4 text-white/[0.78]">
      {children}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  href,
  secondary = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  secondary?: boolean;
}) {
  const className = secondary
    ? "inline-flex h-[42px] w-full items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-[13px] font-bold text-white/[0.78] transition hover:bg-white/[0.07]"
    : "inline-flex h-[42px] w-full items-center justify-center rounded-xl bg-[linear-gradient(101.83deg,#54AFE0_0%,#54AFE0_100%)] px-4 text-[13px] font-bold text-white shadow-[0_6px_20px_0_rgba(26,106,232,0.32)] transition hover:opacity-90";

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export default function StepSuccess({
  createdToken,
  copied,
  onCopy,
  orgId,
  orgSlug,
  testName,
  founding100OfferEligible,
}: {
  createdToken: string | null;
  copied: boolean;
  onCopy: () => void;
  orgId: string;
  orgSlug: string;
  testName?: string | null;
  founding100OfferEligible: boolean;
}) {
  const url = createdToken ? `${getBaseUrl()}/t/${createdToken}` : null;
  const dashboardHref = `/portal/${orgSlug}/dashboard`;

  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const [claimingOffer, setClaimingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [billingInterval, setBillingInterval] =
    useState<"month" | "year">("month");
  const [addCertification, setAddCertification] = useState(false);

  const showOffer = founding100OfferEligible && !offerDismissed;

  async function claimOffer() {
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
          tier: 2,
          interval: billingInterval,
          offer: "founding-100",
          addCertification,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok || !json?.url) {
        throw new Error(
          json?.error || "Could not start your Founding Member checkout.",
        );
      }

      window.location.href = String(json.url);
    } catch (error: unknown) {
      setOfferError(
        error instanceof Error
          ? error.message
          : "Could not start your Founding Member checkout.",
      );
      setClaimingOffer(false);
    }
  }

  async function sendEmail() {
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
      setShowEmail(false);
    } catch (error: unknown) {
      setEmailStatus(
        error instanceof Error ? error.message : "Failed to send the email",
      );
    } finally {
      setSending(false);
    }
  }

  function downloadEmbedCode() {
    if (!url) return;

    const embedCode = `<iframe src="${url}" width="100%" height="760" style="border:0;border-radius:16px;overflow:hidden;" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    const blob = new Blob([embedCode], { type: "text/plain;charset=utf-8" });
    const fileUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = "mindcanvas-test-embed-code.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(fileUrl);
  }

  return (
    <div className="flex flex-col items-center py-1 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#22C55E]/[0.22] bg-[#22C55E]/10 text-[#22C55E]">
        {showOffer ? (
          <span className="text-[24px]" aria-hidden="true">
            🎉
          </span>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>

      <h3 className="mt-3 text-[17px] font-extrabold text-white">
        {showOffer
          ? "Congratulations! You've created your first test link"
          : "Test link created"}
      </h3>

      <p className="mt-1 max-w-[390px] text-[12px] font-light leading-5 text-white/[0.62]">
        {showOffer
          ? "Your link is ready to share."
          : "You can now activate, copy, and share your test link."}
      </p>

      {showOffer && (
        <div className="mt-4 w-full rounded-[16px] border border-[#54AFE0]/25 bg-[#54AFE0]/[0.07] p-4 text-left">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#54AFE0]">
            Founding 100 invitation
          </p>

          <h4 className="mt-2 text-center text-[16px] font-extrabold leading-6 text-white">
            Become one of our first 100 Founding Members
          </h4>

          <p className="mt-1 text-center text-[12px] leading-5 text-white/[0.68]">
            Secure{" "}
            <strong className="font-bold text-white">
              70% off Pro for life
            </strong>
            .
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <OfferPill>✓ 35 test submissions / month</OfferPill>
            <OfferPill>✓ Sales Engine profiling</OfferPill>
            <OfferPill>✓ Coaching Engine profiling</OfferPill>
            <OfferPill>✓ Training, expert sessions &amp; community</OfferPill>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/[0.55]">
                Billing cycle
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBillingInterval("month")}
                  disabled={claimingOffer}
                  className={`rounded-xl border px-3 py-2.5 text-center text-[11.5px] font-bold transition ${
                    billingInterval === "month"
                      ? "border-[#54AFE0] bg-[#54AFE0]/15 text-white"
                      : "border-white/[0.09] bg-white/[0.04] text-white/[0.55]"
                  }`}
                >
                  Monthly
                </button>

                <button
                  type="button"
                  onClick={() => setBillingInterval("year")}
                  disabled={claimingOffer}
                  className={`rounded-xl border px-3 py-2.5 text-center text-[11.5px] font-bold transition ${
                    billingInterval === "year"
                      ? "border-[#54AFE0] bg-[#54AFE0]/15 text-white"
                      : "border-white/[0.09] bg-white/[0.04] text-white/[0.55]"
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <input
                type="checkbox"
                checked={addCertification}
                disabled={claimingOffer}
                onChange={(event) => setAddCertification(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#54AFE0]"
              />

              <span className="text-[11px] leading-5 text-white/[0.62]">
                Add{" "}
                <strong className="font-bold text-white">
                  Certified Profiletest.ai Consultant
                </strong>{" "}
                for a one-time{" "}
                <strong className="font-bold text-white">$997</strong>.
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={claimOffer}
            disabled={claimingOffer}
            className="mt-3 inline-flex h-[42px] w-full items-center justify-center rounded-xl bg-[linear-gradient(101.83deg,#54AFE0_0%,#54AFE0_100%)] px-4 text-[13px] font-bold text-white shadow-[0_6px_20px_0_rgba(26,106,232,0.32)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claimingOffer
              ? "Opening secure checkout…"
              : "Secure my Founding Membership →"}
          </button>

          {offerError && (
            <p className="mt-2 text-center text-[11.5px] text-rose-400">
              {offerError}
            </p>
          )}

          <button
            type="button"
            onClick={() => setOfferDismissed(true)}
            disabled={claimingOffer}
            className="mt-2 w-full text-center text-[11.5px] font-medium text-white/[0.5] transition hover:text-white/[0.8]"
          >
            No thanks — I’ll continue on the free trial
          </button>

          <p className="mt-2 text-center text-[10px] leading-4 text-white/[0.38]">
            7-day invitation · Limited to the first 100 paid Founding Members
          </p>
        </div>
      )}

      {url && (
        <>
          <div className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5">
            <div className="min-w-0 flex-1 rounded-lg bg-[#06182a] px-3 py-2 text-left font-mono text-[11px] text-white/[0.62]">
              <span className="block truncate">{url}</span>
            </div>

            <button
              type="button"
              onClick={onCopy}
              className="shrink-0 rounded-lg border border-[#54AFE0]/[0.22] bg-[#54AFE0]/10 px-3 py-2 text-[10.5px] font-bold text-[#54AFE0] transition hover:bg-[#54AFE0]/20"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>

          {showEmail ? (
            <div className="mt-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-left">
              <label className="mb-2 block text-[11px] font-medium text-white/[0.72]">
                Send this link by email
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className={`${darkInputClass} h-[42px] flex-1`}
                />

                <button
                  type="button"
                  onClick={sendEmail}
                  disabled={sending || !email.trim()}
                  className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#54AFE0] px-4 text-[12px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send email"}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmail(false);
                    setEmailStatus(null);
                  }}
                  className="text-[11px] text-white/[0.5] transition hover:text-white/[0.8]"
                >
                  Cancel
                </button>

                {emailStatus && (
                  <p className="text-right text-[11px] text-white/[0.62]">
                    {emailStatus}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="mt-3 text-[12px] font-medium text-[#54AFE0] transition hover:text-white"
            >
              Send this link by email →
            </button>
          )}
        </>
      )}

      <div className="mt-5 grid w-full gap-3">
        <ActionButton onClick={onCopy}>Copy test link</ActionButton>
        <ActionButton onClick={downloadEmbedCode} secondary>
          Download embed code
        </ActionButton>
        <ActionButton href={dashboardHref} secondary>
          Go to dashboard
        </ActionButton>
      </div>
    </div>
  );
}
