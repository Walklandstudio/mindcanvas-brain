'use client';

import * as React from 'react';

export default function InviteForm() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(false);
    setError(null);

    try {
      const res = await fetch('/api/portal/invites/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSent(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-4 max-w-md space-y-3">
      <div className="font-medium">Send test invite</div>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="test.taker@example.com"
        className="w-full border rounded-lg px-3 py-2 text-sm"
        required
      />
      <button
        type="submit"
        disabled={!email}
        className="px-3 py-2 bg-black text-white text-sm rounded-lg disabled:opacity-60"
      >
        Send Invite
      </button>
      {sent && <p className="text-green-600 text-sm">Invite sent!</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
