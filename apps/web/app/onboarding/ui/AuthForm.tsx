'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function AuthForm({ next }: { next: string }) {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? 'https://mindcanvas-staging.vercel.app';

  const redirectTo = `${base}${next}`;

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMsg('Check your email for a magic link to continue.');
    } catch (err: any) {
      setMsg(err.message ?? 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: 'google' | 'github') {
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
      // Redirect handled by Supabase
    } catch (err: any) {
      setMsg(err.message ?? 'OAuth failed');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={signInWithMagicLink} className="space-y-3">
        <label className="block text-sm">Work email</label>
        <input
          type="email"
          required
          className="w-full rounded border px-3 py-2"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-2 rounded-2xl bg-black text-white"
        >
          {busy ? 'Sending link…' : 'Send magic link'}
        </button>
      </form>

      <div className="flex items-center gap-2">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button onClick={() => oauth('google')} disabled={busy} className="w-full px-4 py-2 rounded-2xl border">
          Continue with Google
        </button>
        <button onClick={() => oauth('github')} disabled={busy} className="w-full px-4 py-2 rounded-2xl border">
          Continue with GitHub
        </button>
      </div>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
