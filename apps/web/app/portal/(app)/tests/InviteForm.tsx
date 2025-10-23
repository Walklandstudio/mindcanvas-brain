'use client';

import * as React from 'react';

export default function InviteForm({ defaultTestSlug }: { defaultTestSlug: string }) {
  const [email, setEmail] = React.useState('');
  const [testKey, setTestKey] = React.useState(defaultTestSlug);
  const [busy, setBusy] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setUrl(null);
    try {
      const res = await fetch('/api/portal/invites/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, testKey, kind: 'full', maxUses: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setUrl(data.url);
      try { await navigator.clipboard.writeText(data.url); } catch {}
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border p-3 space-y-2">
      <div className="font-medium text-sm">Send invite</div>
      <div className="flex flex-wrap gap-2">
        <input
          className="px-3 py-2 rounded border text-sm"
          type="email" placeholder="email@company.com" required
          value={email} onChange={e=>setEmail(e.target.value)}
        />
        <input
          className="px-3 py-2 rounded border text-sm"
          placeholder="test slug or id" required
          value={testKey} onChange={e=>setTestKey(e.target.value)}
        />
        <button className="px-3 py-2 rounded border text-sm" disabled={busy}>
          {busy ? 'Sending…' : 'Create invite'}
        </button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      {url && (
        <div className="text-sm">
          Invite link: <a className="underline break-all" target="_blank" rel="noreferrer" href={url}>{url}</a>
          <div className="text-xs text-gray-600">Copied to clipboard (if permitted).</div>
        </div>
      )}
    </form>
  );
}
