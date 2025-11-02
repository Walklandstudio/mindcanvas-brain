'use client';

import * as React from 'react';

type Props = {
  testSlug: string;
  label?: string;
  className?: string;
};

export default function GenerateLinkButton({
  testSlug,
  label = 'Create & Copy Link',
  className,
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUrl, setLastUrl] = React.useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    setLastUrl(null);
    try {
      const res = await fetch('/api/portal/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testKey: testSlug, kind: 'full', maxUses: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create link');

      setLastUrl(data.url);
      try { await navigator.clipboard.writeText(data.url); } catch {}
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="px-3 py-2 rounded-xl border text-sm disabled:opacity-60"
      >
        {busy ? 'Creating…' : label}
      </button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      {lastUrl && (
        <div className="mt-2 text-sm">
          <a href={lastUrl} target="_blank" className="underline break-all">{lastUrl}</a>
          <div className="text-xs text-gray-600 mt-1">Copied to clipboard.</div>
        </div>
      )}
    </div>
  );
}
