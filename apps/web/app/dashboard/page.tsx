'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type Org = { id: string; name: string; slug: string };

export default function Dashboard() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // require auth
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.replace('/login');
        return;
      }

      // ensure org exists for this user (bootstrap)
      const token = sess.session.access_token;
      await fetch('/api/bootstrap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      // fetch user's org (first one)
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id,name,slug')
        .limit(1);

      setOrg(orgs?.[0] ?? null);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <a className="text-sm underline" href="/logout">Sign out</a>
      </header>

      {org ? (
        <section className="rounded-lg border p-4 space-y-2 bg-white">
          <div className="font-medium">{org.name}</div>
          <div className="text-sm text-gray-600">/{org.slug}</div>

          <div className="pt-2">
            <a
              href="/onboarding"
              className="inline-block rounded-md bg-black px-4 py-2 text-white hover:opacity-90"
            >
              Start Onboarding
            </a>
          </div>
        </section>
      ) : (
        <p>No organization found.</p>
      )}
    </main>
  );
}
