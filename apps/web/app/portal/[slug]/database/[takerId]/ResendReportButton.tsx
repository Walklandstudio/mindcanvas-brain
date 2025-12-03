"use client";

import { useState } from "react";

type Props = {
  takerId: string;
  canSend: boolean;
};

export default function ResendReportButton({ takerId, canSend }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    if (!canSend || loading) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/portal/takers/${encodeURIComponent(
          takerId
        )}/resend-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || (json && json.ok === false)) {
        setMsg(json?.error || "Failed to resend email");
      } else {
        setMsg("Email sent ✔");
      }
    } catch (e: any) {
      setMsg(e?.message || "Failed to resend email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={!canSend || loading}
        onClick={onClick}
        className={`rounded-md border px-3 py-2 text-sm disabled:opacity-60 ${
          canSend
            ? "border-sky-500 text-sky-700 hover:bg-sky-50"
            : "border-slate-300 text-slate-400 cursor-not-allowed"
        }`}
      >
        {loading ? "Sending…" : "Resend report email"}
      </button>
      {!canSend && (
        <p className="text-xs text-gray-500">
          Add an email address to this test taker first.
        </p>
      )}
      {msg && (
        <p className="text-xs text-gray-600" aria-live="polite">
          {msg}
        </p>
      )}
    </div>
  );
}
