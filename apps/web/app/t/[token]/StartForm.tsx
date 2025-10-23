'use client';
import * as React from 'react';

export default function StartForm({ token }: { token: string }) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);

    try {
      const res = await fetch(`/api/test/${token}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setOk('Started!');
      // TODO: navigate to questions page
      // window.location.href = `/t/${token}/start` or similar as your flow requires
    } catch (e: any) {
      setErr(e?.message || 'Failed to start');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input className="border rounded px-3 py-2 w-full text-sm" placeholder="First name"
             value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input className="border rounded px-3 py-2 w-full text-sm" placeholder="Last name"
             value={lastName} onChange={e => setLastName(e.target.value)} />
      <input type="email" className="border rounded px-3 py-2 w-full text-sm" placeholder="Email"
             value={email} onChange={e => setEmail(e.target.value)} />

      <button type="submit" disabled={busy}
              className="px-3 py-2 border rounded text-sm disabled:opacity-60">
        {busy ? 'Starting…' : 'Begin Test'}
      </button>

      {err && <div className="text-red-600 text-sm">{err}</div>}
      {ok && <div className="text-green-600 text-sm">{ok}</div>}
    </form>
  );
}
