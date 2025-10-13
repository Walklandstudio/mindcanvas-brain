'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, LabelList,
} from 'recharts';

type WeeklyPoint = { date: string; count: number };
type Summary = { submissions: number; uniqueClients: number };
type FlowDist = { A: number; B: number; C: number; D: number; total: number };
type ProfileBucket = { code: string; name: string; count: number };
type ProfileDist = { buckets: ProfileBucket[]; total: number };

const DEFAULT_DAYS = 30;

export default function DashboardPage() {
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [tests, setTests] = useState<string[]>([]);
  const [testSlug, setTestSlug] = useState<string>('all');
  const [company, setCompany] = useState<string>('');
  const [team, setTeam] = useState<string>('');

  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [summary, setSummary] = useState<Summary>({ submissions: 0, uniqueClients: 0 });
  const [flow, setFlow] = useState<FlowDist>({ A: 0, B: 0, C: 0, D: 0, total: 0 });
  const [profiles, setProfiles] = useState<ProfileDist>({ buckets: [], total: 0 });
  const [loading, startTransition] = useTransition();

  // Load distinct tests for the dropdown
  useEffect(() => {
    (async () => {
      const r = await fetch('/api/dashboard/tests', { cache: 'no-store' });
      const j = await r.json();
      const list: string[] = Array.isArray(j.tests) ? j.tests : [];
      setTests(list);
    })();
  }, []);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    u.set('days', String(days));
    if (testSlug && testSlug !== 'all') u.set('testSlug', testSlug);
    if (company.trim()) u.set('company', company.trim());
    if (team.trim()) u.set('team', team.trim());
    return u.toString();
  }, [days, testSlug, company, team]);

  // Fetch dashboard data
  useEffect(() => {
    startTransition(async () => {
      const [w, s, fd, pd] = await Promise.all([
        fetch(`/api/dashboard/weekly?${qs}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/dashboard/summary?${qs}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/dashboard/flow-distribution?${qs}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/dashboard/profile-distribution?${qs}`, { cache: 'no-store' }).then(r => r.json()),
      ]);
      setWeekly(w.series ?? []);
      setSummary({ submissions: s.submissions ?? 0, uniqueClients: s.uniqueClients ?? 0 });
      setFlow({ ...(fd.flow ?? { A: 0, B: 0, C: 0, D: 0 }), total: fd.total ?? 0 });
      setProfiles({ buckets: pd.buckets ?? [], total: pd.total ?? 0 });
    });
  }, [qs]);

  const flowRows = useMemo(
    () =>
      [
        { label: 'Catalyst', value: flow.A },
        { label: 'Communications', value: flow.B },
        { label: 'Rhythmic', value: flow.C },
        { label: 'Observer', value: flow.D },
      ].sort((a, b) => b.value - a.value),
    [flow],
  );

  const profileRows = useMemo(
    () =>
      [...(profiles.buckets ?? [])]
        .sort((a, b) => b.count - a.count)
        .map(b => ({
          label: b.name || b.code,
          value: b.count,
        })),
    [profiles],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {loading ? <span className="text-sm text-gray-500">Refreshing…</span> : null}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="col-span-1">
          <label className="mb-1 block text-xs text-gray-600">Timeframe</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="mb-1 block text-xs text-gray-600">Test</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={testSlug}
            onChange={(e) => setTestSlug(e.target.value)}
          >
            <option value="all">All tests</option>
            {tests.map(slug => (
              <option key={slug} value={slug}>{slug}</option>
            ))}
          </select>
        </div>

        <div className="col-span-1">
          <label className="mb-1 block text-xs text-gray-600">Company</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Filter by company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="col-span-1">
          <label className="mb-1 block text-xs text-gray-600">Team</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Filter by team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Submissions</div>
          <div className="text-2xl font-semibold">{summary.submissions}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Unique clients</div>
          <div className="text-2xl font-semibold">{summary.uniqueClients}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Top Flow</div>
          <div className="text-2xl font-semibold">
            {
              [...flowRows].sort((a, b) => b.value - a.value)[0]?.label ?? '—'
            }
          </div>
        </div>
      </div>

      {/* Weekly submissions */}
      <section className="mb-8 rounded-xl border bg-white p-4">
        <div className="mb-3 text-sm font-medium">Weekly submissions</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#111827" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Distributions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 text-sm font-medium">Flow distribution (top flow per submission)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={flowRows} margin={{ left: 16, right: 16 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={160} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                  <LabelList dataKey="value" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 text-sm font-medium">Profile distribution (primary per submission)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={profileRows} margin={{ left: 16, right: 16 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={220} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                  <LabelList dataKey="value" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
