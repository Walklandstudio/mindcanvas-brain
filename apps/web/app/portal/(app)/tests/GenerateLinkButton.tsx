// apps/web/app/portal/(app)/tests/GenerateLinkButton.tsx
"use client";

import * as React from "react";

export default function GenerateLinkButton({
  testId,
  testSlug,
  label = "Generate link",
  className = "",
}: {
  testId?: string;
  testSlug?: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setErr(null);
    setUrl(null);
    try {
      const res = await fetch("/api/portal/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testId ? { testId } : { testSlug }),
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "Failed to create link");
      setUrl(j.data.url);
      // Try to copy
      try {
        await navigator.clipboard.writeText(j.data.url);
      } catch {}
    } catch (e: any) {
      setErr(e?.message || "Failed to create link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={onClick}
        className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Creating…" : label}
      </button>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline text-blue-600"
          title="Open link in new tab"
        >
          Open
        </a>
      )}

      {url && (
        <button
          onClick={() => navigator.clipboard.writeText(url)}
          className="text-xs underline"
          title="Copy to clipboard"
        >
          Copy
        </button>
      )}

      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
