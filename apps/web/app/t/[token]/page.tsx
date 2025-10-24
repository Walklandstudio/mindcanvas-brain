// apps/web/app/t/[token]/page.tsx
'use client';

import * as React from 'react';

export default function TakePage({ params }: any) {
  const token = String(params?.token || '').trim();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function begin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);

    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      firstName: String(fd.get('firstName') || ''),
      lastName: String(fd.get('lastName') || ''),
      email: String(fd.get('email') || ''),
    };

    try {
      const res = await fetch(`/api/public/test/${token}`, { method: 'GET' });
      const meta = await res.json().catch(() => ({}));
      if (!res.ok || !meta?.ok) {
        setMsg(meta?.error || `Invalid link (${res.status})`);
        setBusy(false);
        return;
      }

      const res2 = await fetch(`/api/public/test/${token}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res2.json().catch(() => ({}));
      if (!res2.ok || !data?.ok) {
        setMsg(data?.error || `Start failed (${res2.status})`);
        setBusy(false);
        return;
      }

      setMsg('✅ Started! (Next: navigate to question 1)');
      // TODO: navigate to first question route when ready
      // window.location.href = `/t/${token}/start`;
    } catch (err: any) {
      setMsg(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Team Puzzle — Start</h1>

      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 13,
          padding: 8,
          background: '#f6f6f6',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        token: <strong id="token">{token}</strong>
        <button
          onClick={() => {
            const t = document.getElementById('token')?.textContent || '';
            navigator.clipboard?.writeText(t);
          }}
          style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 6 }}
        >
          Copy
        </button>
      </div>

      <form onSubmit={begin} style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        <input name="firstName" placeholder="First name" />
        <input name="lastName" placeholder="Last name" />
        <input name="email" placeholder="Email" />
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Starting…' : 'Begin Test'}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
