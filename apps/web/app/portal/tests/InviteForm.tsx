'use client';

import * as React from 'react';

type TestRow = { id: string; name: string; slug: string };

export default function InviteForm({ tests }: { tests: TestRow[] }) {
  const [email, setEmail] = React.useState('');
  const [testKey, setTestKey] = React.useState(tests[0]?.slug ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUrl(null);

    try {
      // Your API expects both email and testKey
      const res = await fetch('/api/portal/invites/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, testKey, kind: 'full', maxUses: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // API returns { token, url } — show it and copy to clipboard
      const inviteUrl: string = data.url;
      setUrl(inviteUrl);
      try { await navigator.clipboard.writeText(inviteUrl); } catch {}
      setEmail('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create invite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-3">
      <div className="font-medium">Send test invite</div>

      <div className="grid sm:grid-cols-2 gap-2">
        <label className="text-sm">
          <div className="mb-1 font-medium">Test</div>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={testKey}
            onChange={e => setTestKey(e.target.value)}
            required
          >
            {tests.map(t => (
              <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-1 font-medium">Recipient email</div>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="taker@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-3 py-2 rounded-lg border text-sm disabled:opacity-60"
          disabled={busy}
        >
          {busy ? 'Sending…' : 'Send Invite'}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {url && (
        <div className="text-sm">
          Invite link:&nbsp;
          <a className="underline break-all" href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
          <div className="text-xs text-gray-600">Copied to clipboard (if permitted).</div>
        </div>
      )}
    </form>
  );
}
