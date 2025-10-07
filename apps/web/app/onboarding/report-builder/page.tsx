'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function ReportBuilderStub() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [loading, setLoading] = useState(true);
  const [fw, setFw] = useState<{ frequencies: string; profiles_count: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.replace('/login');
      const token = sess.session.access_token;

      const res = await fetch('/api/onboarding/framework', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await res.json();
      if (j?.ok && j.data) setFw({ frequencies: j.data.frequencies, profiles_count: j.data.profiles_count });
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Report Builder (stub)</h1>
      {fw ? (
        <div className="rounded-lg border p-4 bg-white">
          <div><span className="font-medium">Frequencies:</span> {fw.frequencies}</div>
          <div><span className="font-medium">Profiles:</span> {fw.profiles_count}</div>
        </div>
      ) : (
        <p>No framework settings found. <a className="underline" href="/onboarding/framework">Set framework</a>.</p>
      )}
      <p className="text-sm text-gray-600">
        This is a placeholder. Next we’ll build the real report-config UI (sections, prompts, etc.).
      </p>
      <a className="text-sm underline" href="/dashboard">Back to Dashboard</a>
    </main>
  );
}
