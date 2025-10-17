'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const redirectTo =
    (typeof window !== 'undefined' ? window.location.origin : 'https://mindcanvas-staging.vercel.app') +
    '/admin/test-builder';

  // Already signed in? go straight to builder
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) router.replace('/admin/test-builder');
    });
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
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
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
      // will redirect
    } catch (err: any) {
      setMsg(err.message ?? 'OAuth failed');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow space-y-4">
        <h1 className="text-xl font-semibold">Welcome to MindCanvas</h1>
        <p className="text-sm text-gray-600">
          Sign in to access the Test Builder. We’ll set up your workspace automatically.
        </p>

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
          <button
            onClick={() => oauth('google')}
            disabled={busy}
            className="w-full px-4 py-2 rounded-2xl border"
          >
            Continue with Google
          </button>
          <button
            onClick={() => oauth('github')}
            disabled={busy}
            className="w-full px-4 py-2 rounded-2xl border"
          >
            Continue with GitHub
          </button>
        </div>

        {msg && <p className="text-sm text-gray-700">{msg}</p>}

        <p className="mt-2 text-xs text-gray-500">
          After sign-in you’ll be redirected to the Test Builder. We’ll create a demo org,
          a default test, and seed the 15 base questions if needed.
        </p>
      </div>
    </main>
  );
}
