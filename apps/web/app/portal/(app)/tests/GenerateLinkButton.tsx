// apps/web/app/portal/(app)/tests/GenerateLinkButton.tsx
"use client";

import { useState } from "react";

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M9 7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V7Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M10 14a3 3 0 0 0 4 0l3-3a3 3 0 0 0-4-4l-.5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 10a3 3 0 0 0-4 0l-3 3a3 3 0 0 0 4 4l.5-.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export default function GenerateLinkButton({ testId }: { testId: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setErr(null);
    setUrl(null);
    try {
      const res = await fetch("/api/portal/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_id: testId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to generate link.");

      setUrl(j.url);
      try {
        await navigator.clipboard.writeText(j.url);
      } catch {
        // Clipboard may fail in some browsers/permissions; URL is still shown.
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to generate link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? <Spinner /> : <LinkIcon />} Generate Link
      </button>
      {url && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <CopyIcon />{" "}
          <a href={url} target="_blank" className="underline break-all" rel="noreferrer">
            {url}
          </a>
        </div>
      )}
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
