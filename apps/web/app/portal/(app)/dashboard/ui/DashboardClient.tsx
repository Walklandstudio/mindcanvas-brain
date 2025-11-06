'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Lazy load Recharts on the client
const ResponsiveContainer = dynamic(
  async () => (await import('recharts')).ResponsiveContainer,
  { ssr: false }
);
const BarChart = dynamic(async () => (await import('recharts')).BarChart, { ssr: false });
const Bar = dynamic(async () => (await import('recharts')).Bar, { ssr: false });
const XAxis = dynamic(async () => (await import('recharts')).XAxis, { ssr: false });
const YAxis = dynamic(async () => (await import('recharts')).YAxis, { ssr: false });
const Tooltip = dynamic(async () => (await import('recharts')).Tooltip, { ssr: false });
const CartesianGrid = dynamic(async () => (await import('recharts')).CartesianGrid, { ssr: false });

type KV = { key: string; value: number };
type Payload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);

  function escapeCell(v: any): string {
    const s = String(v == null ? '' : v);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  const head = headers.join(',');
  const body = rows
    .map((r) => headers.map((h) => escapeCell(r[h])).join(','))
    .join('\n');

  return head + '\n' + body;
}

function downloadCSV(filename: string, rows: KV[]) {
  const csv = toCSV(rows.map((r) => ({ name: r.key, value: r.value })));
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardClient() {
  const params = useSearchParams();
  const org = (params.get('org') || '').trim();
  const testId = (params.get('testId') || '').trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    if (!org) return;

    let active = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        qs.set('org', org);
        if (testId) qs.set('testId', testId);

        const res = await fetch('/api/portal-dashboard?' + qs.toString(), { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;

        if (!json || json.ok !== true) {
          setError((json && json.error) || 'Unknown error');
        } else {
          setData(json.data as Payload);
        }
      } catch (e: any) {
        if (active) setError(e && e.message ? e.message : 'Network error');
      } finally {
        if (active) setLoading(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [org, testId]);

  const freq = (data && data.frequencies) || [];
  const prof = (data && data.profiles) || [];
  const top3 = (data && data.top3) || [];
  const bottom3 = (data && data.bottom3) || [];
  const overall = data && data.overall;

  const freqChartData = useMemo(() => freq.map((f) => ({ name: f.key, value: f.value })), [freq]);
  const profChartData = useMemo(() => prof.map((p) => ({ name: p.key, value: p.value })), [prof]);

  function dlFreq() {
    const name = 'frequencies_' + org + (testId ? '_' + testId : '') + '.csv';
    downloadCSV(name, freq);
  }
  function dlProf() {
    const name = 'profiles_' + org + (testId ? '_' + testId : '') + '.csv';
    downloadCSV(name, prof);
  }

  return (
    <div className="space-y-8">
      {!org && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          Add <code>?org=team-puzzle</code> or <code>?org=competency-coach</code> to the URL.
        </div>
      )}

      {loading && <div className="text-sm opacity-70">Loading data…</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {overall && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-60">Overall Average</div>
            <div className="text-2xl font-semibold">{overall.average == null ? '—' : overall.average}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-60">Total Responses</div>
            <div className="text-2xl font-semibold">{overall.count == null ? '—' : overall.count}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-60">Scope</div>
            <div className="text-2xl font-semibold">
              {org}
              {testId ? ' • testId:' + testId.slice(0, 8) + '…' : ''}
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Frequencies</h2>
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            disabled={!org || freq.length === 0}
            onClick={dlFreq}
          >
            Download CSV
          </button>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={freqChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Profiles</h2>
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            disabled={!org || prof.length === 0}
            onClick={dlProf}
          >
            Download CSV
          </button>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={profChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {(top3.length > 0 || bottom3.length > 0) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <h3 className="mb-2 text-base font-medium">Top 3</h3>
            <ul className="space-y-1 text-sm">
              {top3.map((t) => (
                <li key={t.key} className="flex items-center justify-between">
                  <span>{t.key}</span>
                  <span className="font-semibold">{t.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-4">
            <h3 className="mb-2 text-base font-medium">Bottom 3</h3>
            <ul className="space-y-1 text-sm">
              {bottom3.map((b) => (
                <li key={b.key} className="flex items-center justify-between">
                  <span>{b.key}</span>
                  <span className="font-semibold">{b.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
