'use client';

import { useEffect, useMemo, useState } from 'react';

// Types returned by our endpoints
type ResultPayload = {
  ok: boolean;
  taker?: { id: string; first_name: string | null; last_name: string | null; email: string | null; status: string };
  totals?: Record<string, number>;
  error?: string;
};

type MetaPayload = {
  ok: boolean;
  test_id?: string;
  profiles?: Array<{ id: string; name: string; code: string | null; frequency: 'A' | 'B' | 'C' | 'D' | null }>;
  thresholds?: Array<{ type: 'frequency' | 'profile'; label: string; greater_than: number | null; less_than: number | null }>;
  error?: string;
};

export default function ResultPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [res, setRes] = useState<ResultPayload | null>(null);
  const [meta, setMeta] = useState<MetaPayload | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      setErr('');
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/public/test/${token}/result`, { cache: 'no-store' }),
          fetch(`/api/public/test/${token}/meta`, { cache: 'no-store' }),
        ]);
        const j1 = (await r1.json().catch(() => ({}))) as ResultPayload;
        const j2 = (await r2.json().catch(() => ({}))) as MetaPayload;

        if (!j1?.ok) throw new Error(j1?.error || `Result HTTP ${r1.status}`);
        if (!j2?.ok) throw new Error(j2?.error || `Meta HTTP ${r2.status}`);

        setRes(j1);
        setMeta(j2);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load result');
      }
    })();
  }, [token]);

  const profiles = meta?.profiles ?? [];
  const totals = res?.totals ?? {};
  const taker = res?.taker;

  // Build profile->frequency map
  const profileFreqMap = useMemo<Record<string, 'A'|'B'|'C'|'D'>>(() => {
    const m: Record<string, 'A'|'B'|'C'|'D'> = {};
    for (const p of profiles) {
      const key = (p?.name || p?.code || '').trim();
      if (key && p.frequency) m[key] = p.frequency;
    }
    return m;
  }, [profiles]);

  // Sum totals into frequency buckets using profile->frequency mapping
  const frequencyTotals = useMemo(() => {
    const f: Record<'A'|'B'|'C'|'D', number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const [profileName, score] of Object.entries(totals)) {
      const freq = profileFreqMap[profileName];
      if (freq && typeof score === 'number') f[freq] += score;
    }
    return f;
  }, [totals, profileFreqMap]);

  // Determine top profile
  const topProfile = useMemo(() => {
    let best: { name: string; score: number } | null = null;
    for (const [name, score] of Object.entries(totals)) {
      if (typeof score !== 'number') continue;
      if (!best || score > best.score) best = { name, score };
    }
    return best;
  }, [totals]);

  // Apply thresholds (if present)
  const thresholds = meta?.thresholds ?? [];
  const freqThresholds = thresholds.filter(t => t.type === 'frequency');
  const profThresholds = thresholds.filter(t => t.type === 'profile');

  // Return label for a numeric score using a threshold table
  function labelFromThreshold(score: number, table: typeof thresholds) {
    // The table is expected to be defined in descending "greater_than" order (we ordered that in SQL).
    for (const t of table) {
      const gt = t.greater_than ?? Number.NEGATIVE_INFINITY;
      const lt = t.less_than ?? Number.POSITIVE_INFINITY;
      if (score > gt && score < lt) return t.label;
    }
    return null;
  }

  // Compute interpreted frequency label by picking the highest frequency bucket and applying thresholds for that bucket score
  const interpretedFrequency = useMemo(() => {
    const entries: Array<{ key: 'A'|'B'|'C'|'D'; value: number }> = [
      { key: 'A', value: frequencyTotals.A },
      { key: 'B', value: frequencyTotals.B },
      { key: 'C', value: frequencyTotals.C },
      { key: 'D', value: frequencyTotals.D },
    ];
    entries.sort((a, b) => b.value - a.value);
    const top = entries[0];
    const label = freqThresholds.length ? labelFromThreshold(top.value, freqThresholds) : top.key;
    return { key: top.key, value: top.value, label: label ?? top.key };
  }, [frequencyTotals, freqThresholds]);

  // Compute interpreted profile label for the top profile score
  const interpretedProfile = useMemo(() => {
    if (!topProfile) return null;
    const label = profThresholds.length ? labelFromThreshold(topProfile.score, profThresholds) : topProfile.name;
    return { name: topProfile.name, score: topProfile.score, label: label ?? topProfile.name };
  }, [topProfile, profThresholds]);

  if (err) {
    return (
      <main className="mc-bg min-h-screen text-white p-6">
        <h1 className="text-2xl font-bold mb-3">Result</h1>
        <div className="rounded-xl bg-red-500/15 border border-red-400/40 p-4">{String(err)}</div>
      </main>
    );
  }
  if (!res || !meta) {
    return <main className="mc-bg min-h-screen text-white p-6">Loading…</main>;
  }

  return (
    <main className="mc-bg min-h-screen text-white p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Your Report</h1>
        <p className="text-white/70">
          {taker?.first_name ? `Hi ${taker.first_name}! ` : ''}
          Status: <span className="font-medium">{taker?.status ?? 'unknown'}</span>
        </p>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="text-sm text-white/70 mb-1">Top Profile</div>
          <div className="text-2xl font-semibold">
            {interpretedProfile ? interpretedProfile.label : '—'}
          </div>
          {interpretedProfile && interpretedProfile.label !== interpretedProfile.name && (
            <div className="text-white/70 text-sm">({interpretedProfile.name})</div>
          )}
          <div className="text-white/60 text-sm mt-2">Score: {interpretedProfile?.score ?? 0}</div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="text-sm text-white/70 mb-1">Dominant Frequency</div>
          <div className="text-2xl font-semibold">
            {interpretedFrequency?.label ?? '—'}
          </div>
          <div className="text-white/60 text-sm mt-2">
            A:{frequencyTotals.A} · B:{frequencyTotals.B} · C:{frequencyTotals.C} · D:{frequencyTotals.D}
          </div>
        </div>
      </section>

      {/* Profile totals */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Profile Scores</h2>
        <div className="space-y-2">
          {Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .map(([name, score]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-48 shrink-0">{name}</div>
                <div className="grow h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/70"
                    style={{ width: `${Math.min(100, (score / Math.max(1, topScore(totals))) * 100)}%` }}
                  />
                </div>
                <div className="w-12 text-right">{score}</div>
              </div>
            ))}
        </div>
      </section>

      {/* Raw debug toggle if needed */}
      <details className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <summary className="cursor-pointer">Debug JSON</summary>
        <pre className="mt-3 text-xs whitespace-pre-wrap">{JSON.stringify({ res, meta, frequencyTotals, profileFreqMap }, null, 2)}</pre>
      </details>
    </main>
  );
}

function topScore(totals: Record<string, number>) {
  let m = 1;
  for (const v of Object.values(totals)) if (typeof v === 'number' && v > m) m = v;
  return m;
}

