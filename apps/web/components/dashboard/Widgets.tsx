'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';
import { downloadCsv, toCsv } from '@/lib/csv';
import { useMemo } from 'react';

type Freq = { frequency_code: string; frequency_name: string; avg_points: number };
type Prof = { profile_code: string; profile_name: string; avg_points: number };
type Rank = { rnk: number; profile_code: string; profile_name: string; avg_points: number };

export function OverallTile({ overallAvg }: { overallAvg: number | null | undefined }) {
  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-white">
      <p className="text-sm text-gray-500">Overall Average</p>
      <div className="text-3xl font-semibold mt-1">{overallAvg ?? '—'}</div>
    </div>
  );
}

export function FrequenciesBar({ data }: { data: Freq[] }) {
  const rows = (data ?? []).map(d => ({ code: d.frequency_code, name: d.frequency_name, value: Number(d.avg_points ?? 0) }));
  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Frequencies</h3>
        <button
          onClick={() => {
            const csv = toCsv(['code', 'name', 'avg_points'], rows.map(r => [r.code, r.name, r.value]));
            downloadCsv('frequencies.csv', csv);
          }}
          className="text-sm underline"
        >
          Download CSV
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              <LabelList dataKey="value" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProfilesBar({ data }: { data: Prof[] }) {
  const rows = (data ?? []).map(d => ({ code: d.profile_code, name: d.profile_name, value: Number(d.avg_points ?? 0) }));
  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Profiles</h3>
        <button
          onClick={() => {
            const csv = toCsv(['code', 'name', 'avg_points'], rows.map(r => [r.code, r.name, r.value]));
            downloadCsv('profiles.csv', csv);
          }}
          className="text-sm underline"
        >
          Download CSV
        </button>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              <LabelList dataKey="value" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TopBottom({ top3, bottom3 }: { top3: Rank[]; bottom3: Rank[] }) {
  const dl = useMemo(() => ({
    topCsv: toCsv(['rank','code','name','avg_points'], (top3 ?? []).map(r => [r.rnk, r.profile_code, r.profile_name, r.avg_points])),
    bottomCsv: toCsv(['rank','code','name','avg_points'], (bottom3 ?? []).map(r => [r.rnk, r.profile_code, r.profile_name, r.avg_points])),
  }), [top3, bottom3]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border p-5 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Top 3 Profiles</h3>
          <button onClick={() => downloadCsv('top3.csv', dl.topCsv)} className="text-sm underline">CSV</button>
        </div>
        <ul className="space-y-2">
          {(top3 ?? []).map(item => (
            <li key={item.profile_code} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{item.rnk}. {item.profile_name}</span>
              <span className="font-medium">{item.avg_points}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border p-5 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Bottom 3 Profiles</h3>
          <button onClick={() => downloadCsv('bottom3.csv', dl.bottomCsv)} className="text-sm underline">CSV</button>
        </div>
        <ul className="space-y-2">
          {(bottom3 ?? []).map(item => (
            <li key={item.profile_code} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{item.rnk}. {item.profile_name}</span>
              <span className="font-medium">{item.avg_points}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function HeaderFilters({
  org,
  testId,
  onChange,
}: {
  org: string;
  testId: string;
  onChange: (next: { org: string; testId: string }) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Organisation</label>
        <input
          className="border rounded-lg px-3 py-2"
          value={org}
          onChange={(e) => onChange({ org: e.target.value, testId })}
          placeholder="team-puzzle"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Test ID (optional)</label>
        <input
          className="border rounded-lg px-3 py-2 w-64"
          value={testId}
          onChange={(e) => onChange({ org, testId: e.target.value })}
          placeholder="uuid…"
        />
      </div>
    </div>
  );
}
