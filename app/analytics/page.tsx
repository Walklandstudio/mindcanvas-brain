'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type TestRow = { id: string; name: string; created_at: string; status: string };
type TakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
  test_id: string;
  test_name: string; // <- flattened from relation
};

export default function AnalyticsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [totalTests, setTotalTests] = useState<number>(0);
  const [totalTakers, setTotalTakers] = useState<number>(0);
  const [last7, setLast7] = useState<number>(0);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [recentTakers, setRecentTakers] = useState<TakerRow[]>([]);
  const [perTestCounts, setPerTestCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      // auth required
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.replace('/login');

      // Counts
      {
        const { count } = await supabase.from('tests').select('id', { count: 'exact', head: true });
        setTotalTests(count || 0);
      }
      {
        const { count } = await supabase.from('test_takers').select('id', { count: 'exact', head: true });
        setTotalTakers(count || 0);
      }
      {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('test_takers')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since);
        setLast7(count || 0);
      }

      // Tests list
      const t = await supabase
        .from('tests')
        .select('id,name,status,created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      setTests(t.data || []);

      // Per-test taker counts (small N; fine to loop)
      const counts: Record<string, number> = {};
      await Promise.all(
        (t.data || []).map(async (row) => {
          const { count } = await supabase
            .from('test_takers')
            .select('id', { count: 'exact', head: true })
            .eq('test_id', row.id);
          counts[row.id] = count || 0;
        })
      );
      setPerTestCounts(counts);

      // Recent takers — flatten relation to a string
      const rt = await supabase
        .from('test_takers')
        .select('id,first_name,last_name,email,created_at,test_id,tests(name)')
        .order('created_at', { ascending: false })
        .limit(10);

      const flattened: TakerRow[] = (rt.data || []).map((r: any) => {
        const rel = r.tests;
        const name =
          Array.isArray(rel) ? (rel[0]?.name ?? '—') :
          rel && typeof rel === 'object' ? (rel.name ?? '—') :
          '—';
        return {
          id: r.id,
          first_name: r.first_name ?? null,
          last_name: r.last_name ?? null,
          email: r.email ?? null,
          created_at: r.created_at,
          test_id: r.test_id,
          test_name: name,
        };
      });
      setRecentTakers(flattened);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tiles = useMemo(
    () => [
      { label: 'Total Tests', value: totalTests },
      { label: 'Total Test-takers', value: totalTakers },
      { label: 'Last 7 Days', value: last7 },
    ],
    [totalTests, totalTakers, last7]
  );

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <nav className="flex items-center gap-3 text-sm">
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/tests">Manage Tests</a>
        </nav>
      </header>

      {/* Tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border bg-white p-4">
            <div className="text-sm text-gray-500">{t.label}</div>
            <div className="mt-1 text-2xl font-semibold">{t.value}</div>
          </div>
        ))}
      </section>

      {/* Tests with counts */}
      <section className="rounded-lg border bg-white">
        <div className="border-b p-4 font-medium">Tests (with taker counts)</div>
        {tests.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No tests yet.</div>
        ) : (
          tests.map((row) => (
            <div key={row.id} className="flex items-center justify-between border-b p-4 last:border-b-0">
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-gray-500">
                  {row.status} • {new Date(row.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  Takers: <span className="font-medium">{perTestCounts[row.id] ?? 0}</span>
                </div>
                <a className="text-sm underline" href={`/tests/${row.id}/takers`}>
                  View
                </a>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Recent takers */}
      <section className="rounded-lg border bg-white">
        <div className="border-b p-4 font-medium">Recent Test-takers</div>
        {recentTakers.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No submissions yet.</div>
        ) : (
          recentTakers.map((r) => (
            <div key={r.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b p-4 last:border-b-0">
              <div>
                <div className="font-medium">
                  {r.first_name || '-'} {r.last_name || ''}
                </div>
                <div className="text-xs text-gray-500">{r.email || ''}</div>
              </div>
              <div className="text-sm">{new Date(r.created_at).toLocaleString()}</div>
              <div className="text-sm text-gray-600">{r.test_name}</div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
