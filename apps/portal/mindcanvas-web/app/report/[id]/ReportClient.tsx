'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';

type Flow = { A: number; B: number; C: number; D: number };
type ProfileRow = { code: string; name: string; pct: number; colorHex?: string };

export type ReportData = {
  person?: { name?: string | null };
  profile?: { code?: string; name?: string; colorHex?: string } | null;
  flow: Flow;
  profiles: ProfileRow[];
};

export default function ReportClient({ data, reportId }: { data: ReportData; reportId: string }) {
  const personName = data.person?.name ?? '—';

  const flowRows = useMemo(() => {
    const arr = [
      { key: 'A', label: 'Catalyst', value: data.flow?.A ?? 0, color: '#4ea5ff' },
      { key: 'B', label: 'Communications', value: data.flow?.B ?? 0, color: '#f2a31b' },
      { key: 'C', label: 'Rhythmic', value: data.flow?.C ?? 0, color: '#1fb874' },
      { key: 'D', label: 'Observer', value: data.flow?.D ?? 0, color: '#7e5bef' },
    ];
    return arr.sort((a, b) => b.value - a.value);
  }, [data.flow]);

  const profileRows = useMemo(() => {
    const order = [...(data.profiles ?? [])].sort((a, b) => b.pct - a.pct);
    const palette = {
      P1: '#175f15',
      P2: '#2ecc2f',
      P3: '#ea430e',
      P4: '#f52905',
      P5: '#f3c90d',
      P6: '#f8ee18',
      P7: '#5d5d5d',
      P8: '#8a8583',
    } as Record<string, string>;
    return order.map(p => ({
      label: p.name,
      value: p.pct,
      color: p.colorHex || palette[p.code] || '#111827',
    }));
  }, [data.profiles]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header with Download */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Report</h1>
          <p className="text-sm text-gray-600">Welcome, {personName}.</p>
        </div>
        <a
          href={`/api/report/${reportId}/pdf`}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
        >
          Download PDF
        </a>
      </div>

      <hr className="mb-6 border-gray-200" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium">Your Coaching Flow</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={flowRows} margin={{ left: 16, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={140} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" radius={[6, 6, 6, 6]} isAnimationActive>
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Primary & Auxiliary Profiles</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={profileRows} margin={{ left: 16, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={220} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <hr className="my-8 border-gray-200" />
      {/* Add Welcome/Outline copy below if desired */}
    </div>
  );
}
