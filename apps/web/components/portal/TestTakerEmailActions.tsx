"use client";

import { useState } from "react";

type Props = {
  orgSlug: string;
  testId: string;
  takerId: string;
  compact?: boolean;
};

type SendType = "send_test_link" | "report" | "resend_report";

const LABELS: Record<SendType, string> = {
  send_test_link: "Send Test Link",
  report: "Send Report Email",
  resend_report: "Resend Report Email",
};

export default function TestTakerEmailActions({
  orgSlug,
  testId,
  takerId,
  compact,
}: Props) {
  const [busyType, setBusyType] = useState<SendType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (type: SendType) => {
    setBusyType(type);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/portal/${orgSlug}/communications/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, testId, takerId }),
        }
      );

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        const detail =
          data?.error ||
          data?.message ||
          data?.detail ||
          `HTTP ${res.status}`;
        setError(detail);
      } else {
        setMessage(`"${LABELS[type]}" email sent.`);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusyType(null);
    }
  };

  const btnBase =
    "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500";
  const btnNeutral =
    btnBase +
    " border-slate-300 bg-white text-slate-800 hover:bg-slate-50";

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className={compact ? "flex flex-wrap gap-1" : "flex flex-wrap gap-2"}>
        <button
          type="button"
          className={btnNeutral}
          disabled={!!busyType}
          onClick={() => send("send_test_link")}
        >
          {busyType === "send_test_link" ? "Sending…" : "Send Test Link"}
        </button>

        <button
          type="button"
          className={btnNeutral}
          disabled={!!busyType}
          onClick={() => send("report")}
        >
          {busyType === "report" ? "Sending…" : "Send Report"}
        </button>

        <button
          type="button"
          className={btnNeutral}
          disabled={!!busyType}
          onClick={() => send("resend_report")}
        >
          {busyType === "resend_report" ? "Resending…" : "Resend Report"}
        </button>
      </div>

      {(message || error) && (
        <p
          className={`text-[11px] ${
            error ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {error || message}
        </p>
      )}
    </div>
  );
}
