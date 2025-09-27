'use client';

import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

type Timeframe = '7d' | '30d' | '90d';

type WeeklyItem = { week: string; submissions: number };
type ProfileSlice = { code: string; count: number };

export default function DashboardPage() {
  const [tf, setTf] = useState<Timeframe>('30d');
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<WeeklyItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileSlice[]>([]);
  const [totals, setTotals] = useState<{ submissions: number; clients: number; tests: number }>({ submissions: 0, clients: 0, tests: 1 });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [w, p, t] = await Promise.all([
        fetch(`/api/dashboard/weekly?tf=${tf}`).then(r => r.json()),
        fetch(`/api/dashboard/profile-distribution?tf=${tf}`).then(r => r.json()),
        fetch(`/api/dashboard/totals?tf=${tf}`).then(r => r.json()),
      ]);
      if (!active) return;
      setWeekly(w.items || []);
      setProfiles(p.items || []);
      setTotals(t);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [tf]);

  const COLORS = useMemo(() => ['#111827', '#4B5563', '#9CA3AF', '#D1D5DB', '#6B7280', '#374151'], []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="flex items-center gap-2">
          {(['7d','30d','90d'] as Timeframe[]).map(x => (
            <button key={x}
              onClick={() => setTf(x)}
              className={`rounded-lg border px-3 py-1 text-sm ${tf===x?'bg-black text-white':'hover:bg-gray-100'}`}
            >
              {x.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Submissions</div>
          <div className="mt-1 text-2xl font-semibold">{totals.submissions}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Unique Clients</div>
          <div className="mt-1 text-2xl font-semibold">{totals.clients}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Active Tests</div>
          <div className="mt-1 text-2xl font-semibold">{totals.tests}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 text-sm font-medium">Profile distribution</div>
          <div className="h-60">
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="count" data={profiles} label>
                  {profiles.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 text-sm font-medium">Weekly submissions</div>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="submissions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
