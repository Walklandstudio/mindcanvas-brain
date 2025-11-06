'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type FreqRow = { frequency_code: string; frequency_name: string; avg_points: number };
type ProfRow = { profile_code: string; profile_name: string; avg_points: number };
type TopRow = { profile_code: string; profile_name: string; avg_points: number; rnk: number };
type Overall = { overall_avg: number };

type DashboardPayload = {
  frequencies: FreqRow[];
  profiles: ProfRow[];
  top3: TopRow[];
  bottom3: TopRow[];
  overall: Overall | null;
};

export default function PortalDashboardPage() {
  const sp = useSearchParams();
  const org = sp?.get('org') ?? 'team-puzzle';
  const testId = sp?.get('testId') ?? '';

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const q = new URLSearchParams();
        q.set('org', org);
        if (testId) q.set('testId', testId);
        const res = await fetch(`/api/portal-dashboard?${q.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        setData(j);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [org, testId]);

  const freqs = useMemo(() => data?.frequencies ?? [], [data]);
  const profs = useMemo(() => data?.profiles ?? [], [data]);
  const top3 = useMemo(() => data?.top3 ?? [], [data]);
  const bottom3 = useMemo(() => data?.bottom3 ?? [], [data]);
  const overallAvg = data?.overall?.overall_avg ?? null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard (preview)</h1>
      <p className="text-sm text-gray-600">
        org=<code>{org}</code>
        {testId ? <> · testId=<code>{testId}</code></> : null}
      </p>

      {loading && <div className="text-gray-600">Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {!loading && !err && (
        <div className="space-y-6">
          <section>
            <h2 className="font-semibold mb-2">Overall</h2>
            <div className="rounded border p-4 bg-white">
              {overallAvg == null ? '—' : `Average points: ${overallAvg}`}
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Frequencies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {freqs.map((f) => (
                <div key={f.frequency_code} className="rounded border p-3 bg-white">
                  <div className="text-sm text-gray-600">{f.frequency_name}</div>
                  <div className="text-xl font-semibold">{f.avg_points}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profs.map((p) => (
                <div key={p.profile_code} className="rounded border p-3 bg-white">
                  <div className="text-sm text-gray-600">{p.profile_name}</div>
                  <div className="text-xl font-semibold">{p.avg_points}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="font-semibold mb-2">Top 3 Profiles</h2>
              <div className="space-y-2">
                {top3.map((t) => (
                  <div key={t.rnk} className="rounded border p-3 bg-white">
                    <div className="text-sm text-gray-600">{t.profile_name}</div>
                    <div className="text-xl font-semibold">{t.avg_points}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Bottom 3 Profiles</h2>
              <div className="space-y-2">
                {bottom3.map((t) => (
                  <div key={t.rnk} className="rounded border p-3 bg-white">
                    <div className="text-sm text-gray-600">{t.profile_name}</div>
                    <div className="text-xl font-semibold">{t.avg_points}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
