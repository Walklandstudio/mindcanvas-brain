'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TestsResp = { tests: { slug: string; count: number }[] };
type WeeklyResp = { series: { date: string; count: number }[] };
type SummaryResp = { submissions: number; uniqueClients: number };
type DistResp = { rows: { code: string; count: number }[] };

// Profile colors (P1..P8 mapping)
const PROFILE_COLORS: Record<string, string> = {
  P1: '#175f15', // Innovator
  P2: '#2ecc2f', // Storyteller
  P3: '#ea430e', // Heart-Centred Coach
  P4: '#f52905', // Negotiator
  P5: '#f3c90d', // Grounded Guide
  P6: '#f8ee18', // Thinker
  P7: '#5d5d5d', // Mastermind
  P8: '#8a8583', // Change Agent
  Unknown: '#cbd5e1',
};

const TIMEFRAMES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

export default function DashboardClient() {
  const [tests, setTests] = useState<TestsResp['tests']>([]);
  const [slug, setSlug] = useState<string | ''>('');
  const [days, setDays] = useState<number>(30);

  const [weekly, setWeekly] = useState<WeeklyResp['series']>([]);
  const [summary, setSummary] = useState<SummaryResp>({ submissions: 0, uniqueClients: 0 });
  const [dist, setDist] = useState<DistResp['rows']>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load test list
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/dashboard/tests', { cache: 'no-store' });
        if (!r.ok) throw new Error(await r.text());
        const j = (await r.json()) as TestsResp;
        if (!alive) return;
        setTests(j.tests);
        // If there is exactly one test, select it by default
        if (j.tests.length === 1) setSlug(j.tests[0].slug);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load dashboard data when filters change
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const qs = new URLSearchParams({ days: String(days) });
        if (slug) qs.set('slug', slug);

        const [w, s, d] = await Promise.all([
          fetch(`/api/dashboard/weekly?${qs.toString()}`, { cache: 'no-store' }),
          fetch(`/api/dashboard/summary?${qs.toString()}`, { cache: 'no-store' }),
          fetch(`/api/dashboard/profile-distribution?${qs.toString()}`, { cache: 'no-store' }),
        ]);

        if (!w.ok) throw new Error(await w.text());
        if (!s.ok) throw new Error(await s.text());
        if (!d.ok) throw new Error(await d.text());

        const wj = (await w.json()) as WeeklyResp;
        const sj = (await s.json()) as SummaryResp;
        const dj = (await d.json()) as DistResp;

        if (!alive) return;
        setWeekly(wj.series);
        setSummary(sj);
        setDist(dj.rows);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [days, slug]);

  const distData = useMemo(
    () =>
      dist.map((r) => ({
        code: r.code,
        count: r.count,
        fill: PROFILE_COLORS[r.code] ?? PROFILE_COLORS.Unknown,
      })),
    [dist],
  );

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 border-b px-4 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">Submissions, clients and profile mix.</p>
        </div>

        <div className="flex gap-3">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            <option value="">All tests</option>
            {tests.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.slug}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err && (
        <div className="mx-4 my-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 p-4 md:grid-cols-3">
        <StatCard title="Submissions" value={summary.submissions} />
        <StatCard title="Unique clients" value={summary.uniqueClients} />
        <div className="rounded-xl border p-4">
          <div className="text-xs text-gray-500">Selected Test</div>
          <div className="mt-1 text-lg font-medium">{slug || 'All tests'}</div>
        </div>
      </div>

      {/* Frequency */}
      <section className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Test Frequency</h2>
        <div className="h-64 w-full rounded-xl border p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Submissions" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Profile distribution */}
      <section className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Profile Distribution</h2>
        <div className="h-72 w-full rounded-xl border p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="code" width={90} />
                <Tooltip />
                <Bar dataKey="count">
                  {/* Recharts uses fill from data items */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Future: multi-test block */}
      <section className="p-4">
        <div className="rounded-xl border p-4">
          <div className="mb-1 text-sm font-semibold">More tests (coming soon)</div>
          <p className="text-sm text-gray-600">
            When you add more tests, this block will show per-test performance and quick actions.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
