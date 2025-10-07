'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else setSent(true);
  }

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // pass the user's access token to bootstrap; then go to dashboard
      const token = data.session.access_token;
      await fetch('/api/bootstrap', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      router.push('/dashboard');
    } else {
      alert('No active session yet. Open the magic link you received via email, then return.');
    }
  }

  return (
    <main className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {sent ? (
        <div className="rounded-lg border p-3 text-sm">
          Check your email for the magic link. After you open it, click:
          <button onClick={checkSession} className="ml-2 underline">I’m back, continue</button>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            type="email" required placeholder="you@company.com" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
          <button className="rounded-md bg-black px-4 py-2 text-white">Send magic link</button>
        </form>
      )}
    </main>
  );
}
