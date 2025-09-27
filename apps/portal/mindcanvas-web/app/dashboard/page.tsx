'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type FlowLabel = 'Catalyst' | 'Communications' | 'Rhythmic' | 'Observer';

interface WeeklyPoint {
  week: string;
  submissions: number;
}
interface FlowBucket {
  flow: FlowLabel;
  count: number;
}
interface LatestRow {
  id: string;
  created_at: string;
  full_profile_code: string | null;
  full_frequency: FlowLabel | null;
}

const FLOW_COLORS: Record<FlowLabel, string> = {
  Catalyst: '#9b5de5',
  Communications: '#f15bb5',
  Rhythmic: '#00bbf9',
  Observer: '#00f5d4',
};

export default function DashboardPage() {
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [flow, setFlow] = useState<FlowBucket[]>([]);
  const [latest, setLatest] = useState<LatestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [w, f, l] = await Promise.all([
          fetch('/api/dashboard/weekly', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/dashboard/distribution', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/dashboard/latest', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        setWeekly(Array.isArray(w) ? w : []);
        setFlow(Array.isArray(f) ? f : []);
        setLatest(Array.isArray(l) ? l : []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <main className="mx-auto max-w-6xl p-6">Loading…</main>;
  }

  const pieData = flow.map((f) => ({ name: f.flow, value: f.count, color: FLOW_COLORS[f.flow] }));

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-4 shadow-sm bg-white">
          <h3 className="text-lg font-semibold mb-3">Weekly submissions</h3>
          <div className="w-full h-72">
            <ResponsiveContainer>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="submissions" name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border p-4 shadow-sm bg-white">
          <h3 className="text-lg font-semibold mb-3">Flow distribution</h3>
          <div className="w-full h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius="80%">
                  {pieData.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-4 shadow-sm bg-white">
        <h3 className="text-lg font-semibold mb-3">Latest submissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Profile</th>
                <th className="py-2 pr-4">Flow</th>
                <th className="py-2 pr-4">Report</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 pr-4 font-mono">{row.id}</td>
                  <td className="py-2 pr-4">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">{row.full_profile_code ?? '—'}</td>
                  <td className="py-2 pr-4">{row.full_frequency ?? '—'}</td>
                  <td className="py-2 pr-4">
                    <a className="underline" href={`/report/${row.id}`}>
                      Open
                    </a>
                  </td>
                </tr>
              ))}
              {latest.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
