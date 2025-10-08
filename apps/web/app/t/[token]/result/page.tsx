'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Scores = { A: number; B: number; C: number; D: number };
type ApiData = {
  taker: { first_name: string | null; last_name: string | null };
  scores: Scores;
  profile_key: 'A' | 'B' | 'C' | 'D';
};

export default function ResultPage(props: any) {
  const token: string = (props?.params?.token as string) || '';
  const sp = useSearchParams();
  const tid: string = sp.get('tid') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiData | null>(null);

  useEffect(() => {
    if (!token || !tid) return;
    (async () => {
      const r = await fetch(`/api/public/test/${token}/result?tid=${encodeURIComponent(tid)}`);
      const j = await r.json();
      if (j?.ok) setData(j.data as ApiData);
      setLoading(false);
    })();
  }, [token, tid]);

  if (!tid) return <main className="p-8">Missing participant id.</main>;
  if (loading) return <main className="p-8">Loading…</main>;
  if (!data) return <main className="p-8">No result available.</main>;

  const name =
    [data.taker.first_name, data.taker.last_name].filter(Boolean).join(' ') || 'Participant';

  const entries: Array<['A' | 'B' | 'C' | 'D', number]> = [
    ['A', data.scores.A],
    ['B', data.scores.B],
    ['C', data.scores.C],
    ['D', data.scores.D],
  ];
  const maxAbs = Math.max(1, ...entries.map(([, v]) => Math.abs(v)));
  const bars = entries.map(([k, v]) => ({
    k,
    v,
    pct: Math.round((Math.abs(v) / maxAbs) * 100),
  }));

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Your Result</h1>
      <p className="text-sm text-gray-600">Hi {name}, here’s your frequency summary.</p>

      <section className="rounded-lg border bg-white p-4">
        <div className="text-sm text-gray-500">Top Frequency</div>
        <div className="text-3xl font-bold mt-1">{data.profile_key}</div>
      </section>

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <div className="font-medium">Frequencies</div>
        {bars.map((b) => (
          <div key={b.k}>
            <div className="flex items-center justify-between text-sm">
              <span>{b.k}</span>
              <span>{data.scores[b.k]}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded">
              <div className="h-2 rounded bg-black" style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3 pt-2">
        <a
          className="rounded-md border px-4 py-2 text-sm"
          href={`/t/${token}/report?tid=${encodeURIComponent(tid)}`}
        >
          View Branded Report
        </a>
        <span className="text-xs text-gray-500">
          The branded report is print / PDF friendly.
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Prototype scoring: scale questions use (answer − 3) × weight to adjust A/B/C/D totals.
      </p>
    </main>
  );
}
