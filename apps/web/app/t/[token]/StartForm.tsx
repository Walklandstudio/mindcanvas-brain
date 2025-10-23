'use client';
import * as React from 'react';

export default function StartForm({ token }: { token: string }) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName]   = React.useState('');
  const [email, setEmail]         = React.useState('');
  const [busy, setBusy]           = React.useState(false);
  const [err, setErr]             = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/public/test/${token}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // navigate to your first question screen here:
      // window.location.href = `/t/${token}/start`
    } catch (e: any) {
      setErr(e?.message || 'Failed to start');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="text-sm text-gray-500">Please enter your details to begin.</div>
      <input className="border rounded px-3 py-2 w-full text-sm" placeholder="First name"
             value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input className="border rounded px-3 py-2 w-full text-sm" placeholder="Last name"
             value={lastName} onChange={e => setLastName(e.target.value)} />
      <input type="email" className="border rounded px-3 py-2 w-full text-sm" placeholder="Email"
             value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit" disabled={busy} className="px-3 py-2 border rounded text-sm disabled:opacity-60">
        {busy ? 'Starting…' : 'Begin Test'}
      </button>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </form>
  );
}
