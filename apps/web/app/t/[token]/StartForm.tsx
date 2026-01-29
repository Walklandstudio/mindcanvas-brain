'use client';
import * as React from 'react';

export default function StartForm({ token }: { token: string }) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName]   = React.useState('');
  const [email, setEmail]         = React.useState('');
  const [busy, setBusy]           = React.useState(false);
  const [err, setErr]             = React.useState<string | null>(null);

  function validate(): string | null {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();

    if (!fn || !ln || !em) {
      return 'Please fill in your first name, last name, and email to begin.';
    }

    // very simple email check – enough to catch obvious mistakes
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(em)) {
      return 'Please enter a valid email address.';
    }

    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setBusy(true);
    setErr(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim().toLowerCase();

    try {
      const res = await fetch(`/api/public/test/${token}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firstName: fn, lastName: ln, email: em }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // TODO: hook this up to wherever you want to send them next
      // e.g. consent screen or first question page:
      // window.location.href = `/t/${token}/start`;
    } catch (e: any) {
      setErr(e?.message || 'Failed to start');
    } finally {
      setBusy(false);
    }
  }

  const hasValues =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="text-sm text-gray-500">
        Please enter your details to begin.
      </div>

      <input
        className="border rounded px-3 py-2 w-full text-sm"
        placeholder="First name"
        value={firstName}
        onChange={e => setFirstName(e.target.value)}
      />

      <input
        className="border rounded px-3 py-2 w-full text-sm"
        placeholder="Last name"
        value={lastName}
        onChange={e => setLastName(e.target.value)}
      />

      <input
        type="email"
        className="border rounded px-3 py-2 w-full text-sm"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <button
        type="submit"
        disabled={busy || !hasValues}
        className="px-3 py-2 border rounded text-sm disabled:opacity-60"
      >
        {busy ? 'Starting…' : 'Begin Test'}
      </button>

      {err && <div className="text-red-600 text-sm">{err}</div>}
    </form>
  );
}

