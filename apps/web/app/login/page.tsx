'use client';

import { useEffect, useState } from 'react';
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

  /**
   * ✅ Central redirect logic:
   * - If user already has org membership → /portal/[slug]/dashboard
   * - Else → keep existing bootstrap + /dashboard behaviour
   */
  async function redirectAfterAuth() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const user = session?.user;

    if (!session || !user) {
      // Not logged in – nothing to do
      return;
    }

    // 1) Look up org memberships
    const { data: memberships, error: orgError } = await supabase
      .from('portal.user_orgs')
      .select('role, orgs!inner(slug)')
      .eq('user_id', user.id);

    if (!orgError && memberships && memberships.length > 0) {
      // 🧩 User belongs to at least one org → go to that portal
      const primary = memberships[0] as any;
      const slug = primary.orgs.slug as string;

      router.replace(`/portal/${slug}/dashboard`);
      return;
    }

    // 2) No org membership (new client) → keep your original bootstrap flow
    const token = session.access_token;
    if (token) {
      await fetch('/api/bootstrap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    // Your existing post-bootstrap behaviour
    router.replace('/dashboard');
  }

  // If already logged in, redirect based on org membership
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return; // not logged in

      await redirectAfterAuth();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await redirectAfterAuth();
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // If email confirmations are ON, user must verify before they can sign in
        if (data.user && !data.session) {
          setMsg('✅ Account created. Please check your email to verify, then sign in.');
        } else {
          await redirectAfterAuth();
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
      <h1 className="text-2xl font-semibold">Sign {mode === 'signin' ? 'in' : 'up'}</h1>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`rounded px-3 py-1 border ${mode === 'signin' ? 'bg-black text-white' : ''}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded px-3 py-1 border ${mode === 'signup' ? 'bg-black text-white' : ''}`}
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
