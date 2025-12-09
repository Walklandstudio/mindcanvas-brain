"use client";

import { FormEvent, useState } from "react";

export default function Start({ params }: { params: { token: string } }) {
  const { token } = params;

  const [dataConsent, setDataConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleStart = async (e: FormEvent) => {
    e.preventDefault();

    if (!dataConsent || submitting) {
      if (!dataConsent) {
        setMsg("Please confirm that you agree to the use of your data before starting.");
      }
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const r = await fetch(`/api/public/test/${token}/start`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataConsent: true,
        }),
      });

      const j = await r.json();

      if (!r.ok) {
        setMsg(j?.error || `Failed (${r.status})`);
        setSubmitting(false);
        return;
      }

      // Preserve existing behaviour: use j.next if present, else fallback
      const nextUrl = j?.next || `/t/${token}`;
      window.location.href = nextUrl;
    } catch (e: any) {
      setMsg(e?.message || "Network error");
      setSubmitting(false);
    }
  };

  const isError = !!msg;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-xl bg-white shadow-sm rounded-lg p-6 border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">Before you start</h1>
        <p className="mt-2 text-sm text-slate-600">
          This assessment uses your responses to generate a personalised profile and report.
          Please confirm that you agree to the use of your data for this purpose.
        </p>

        <form onSubmit={handleStart} className="mt-6 space-y-6">
          <div className="border rounded-lg p-4 bg-slate-50 flex flex-col gap-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={dataConsent}
                onChange={(e) => {
                  setDataConsent(e.target.checked);
                  if (e.target.checked && msg) {
                    setMsg(null);
                  }
                }}
              />
              <span className="text-sm text-slate-800">
                I agree that my responses can be used to build my profile and report.
              </span>
            </label>
            <p className="text-xs text-slate-500">
              You can read our{" "}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" className="underline">
                Terms &amp; Conditions
              </a>{" "}
              for more details on how we handle your data.
            </p>
          </div>

          {msg && (
            <p className={`text-sm ${isError ? "text-red-700" : "text-slate-600"}`}>
              {msg}
            </p>
          )}

          <button
            type="submit"
            disabled={!dataConsent || submitting}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-slate-300
              ${!dataConsent || submitting
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
          >
            {submitting ? "Starting…" : "Start assessment"}
          </button>
        </form>
      </div>
    </div>
  );
}

