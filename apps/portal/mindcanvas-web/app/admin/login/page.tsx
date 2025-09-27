'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = sp.get('next') ?? '/admin/profiles';

  useEffect(() => {
    setError(null);
  }, [password]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Login failed');
        setBusy(false);
        return;
      }
      router.replace(next);
    } catch (e) {
      setError('Network error');
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
      <div className="rounded-xl border p-4 shadow-sm bg-white space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Admin Password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || password.length === 0}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </main>
  );
}
