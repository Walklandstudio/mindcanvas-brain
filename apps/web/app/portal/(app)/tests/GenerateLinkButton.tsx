// apps/web/app/portal/(app)/tests/GenerateLinkButton.tsx
'use client';

import * as React from 'react';

type Props = {
  /** Pass either testId or testSlug (preferred). testKey remains for back-compat. */
  testId?: string;
  testSlug?: string;
  testKey?: string;
  label?: string;
  kind?: 'full' | 'free';
  maxUses?: number;
  className?: string;
};

export default function GenerateLinkButton({
  testId,
  testSlug,
  testKey,
  label = 'Create & Copy Link',
  kind = 'full',
  maxUses = 1,
  className,
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUrl, setLastUrl] = React.useState<string | null>(null);

  const resolvedTestKey = React.useMemo(() => {
    return (testId ?? testSlug ?? testKey ?? '').trim();
  }, [testId, testSlug, testKey]);

  async function handleClick() {
    setBusy(true);
    setError(null);
    setLastUrl(null);

    try {
      if (!resolvedTestKey) throw new Error('Missing test identifier');

      const res = await fetch('/api/portal/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testKey: resolvedTestKey, kind, maxUses }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const url: string = data.url;
      setLastUrl(url);

      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to create link');
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
          <div className="font-medium">Invite link created</div>
          <a href={lastUrl} target="_blank" rel="noreferrer" className="underline break-all">
            {lastUrl}
          </a>
          <div className="text-xs text-gray-600 mt-1">Link copied to clipboard (if permitted).</div>
        </div>
      )}
    </div>
  );
}
