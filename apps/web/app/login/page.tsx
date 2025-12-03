'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  // ✅ Team Puzzle client emails
  const teamPuzzleEmails = [
    'stevep@teba.com.au',
    'info@lifepuzzle.com.au',
    'chandell@lifepuzzle.com.au',
  ];

  // Decide where to go after auth for NON–Team Puzzle users
  const getRedirectPath = () => {
    if (typeof window === 'undefined') {
      return '/dashboard';
    }
    const url = new URL(window.location.href);
    const redirectParam = url.searchParams.get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      // Only allow internal paths for safety
      return redirectParam;
    }
    // Default behaviour if no redirect is provided
    return '/dashboard';
  };

  /**
   * Central redirect logic:
   *
   * 1) If email is one of the Team Puzzle client emails
   *    → FULL PAGE NAVIGATION to /portal/team-puzzle/dashboard
   *
   * 2) Everyone else
   *    → /api/bootstrap + redirect (or /dashboard)
   */
  async function redirectAfterAuth(explicitEmail?: string) {
    let userEmail = explicitEmail?.toLowerCase();

    // If no email passed in, look it up from Supabase.
    if (!userEmail) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user?.email) {
        return;
      }
      userEmail = data.user.email.toLowerCase();
    }

    // 🎯 Case 1: Team Puzzle – do a FULL reload into the portal
    if (teamPuzzleEmails.includes(userEmail)) {
      // Full page navigation so auth cookies are guaranteed to be present
      window.location.href = '/portal/team-puzzle/dashboard';
      return;
    }

    // 🧩 Case 2: everyone else – bootstrap and then redirect
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const token = session?.access_token;

    if (token) {
      await fetch('/api/bootstrap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const redirectPath = getRedirectPath();
    router.replace(redirectPath);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          const userEmail = data.user.email?.toLowerCase();
          await redirectAfterAuth(userEmail);
        }
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // If email confirmations are ON, user must verify before they can sign in
        if (data.user && !data.session) {
          setMsg(
            '✅ Account created. Please check your email to verify, then sign in.'
          );
        } else if (data.user && data.session) {
          const userEmail = data.user.email?.toLowerCase();
          await redirectAfterAuth(userEmail);
        }
      }
    } catch (err: any) {
      setMsg('❌ ' + (err?.message || 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">
        Sign {mode === 'signin' ? 'in' : 'up'}
      </h1>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`rounded px-3 py-1 border ${
            mode === 'signin' ? 'bg-black text-white' : ''
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded px-3 py-1 border ${
            mode === 'signup' ? 'bg-black text-white' : ''
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
        <button
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading
            ? mode === 'signin'
              ? 'Signing in…'
              : 'Creating…'
            : mode === 'signin'
            ? 'Sign in'
            : 'Create account'}
        </button>
      </form>

      {msg && <div className="text-sm">{msg}</div>}

      <div className="text-sm">
        <a className="underline" href="/logout">
          Sign out
        </a>
      </div>
    </main>
  );
}


