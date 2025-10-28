export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { headers as nextHeaders } from 'next/headers';

type TotalsResponse = {
  ok: boolean;
  taker?: { id: string; first_name: string; last_name: string; email: string; status: string };
  totals?: Record<string, number>;
  error?: string;
};

type MetaResponse = {
  ok: boolean;
  test?: { id: string; name: string; slug: string; mode: string };
  meta?: {
    frequencies: { code: 'A'|'B'|'C'|'D'; label: string }[];
    profiles: { code: string; name: string; frequency: 'A'|'B'|'C'|'D' }[];
    thresholds: {
      frequencies?: Record<'A'|'B'|'C'|'D', { greater_than: number; less_than: number }>;
      profiles_full_test?: {
        frequencies: Record<'A'|'B'|'C'|'D', { greater_than: number; less_than: number }>;
        profiles: Record<string, { greater_than: number; less_than: number }>;
      };
    } | null;
  };
  error?: string;
};

async function getBaseUrl() {
  const h = await nextHeaders(); // handles Promise typing in your project
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith('http')
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : null);
  if (envUrl) return envUrl;
  if (!host) throw new Error('missing_host_header');
  return `${proto}://${host}`;
}

async function safeJSON(url: string): Promise<{ ok: boolean; json?: any; status: number; error?: string }> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.ok === false) {
      return { ok: false, status: res.status, error: json?.error || `HTTP ${res.status}`, json };
    }
    return { ok: true, status: res.status, json };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'fetch_failed' };
  }
}

function deriveFrequencyTotals(
  totals: Record<string, number> = {},
  profiles: { code: string; name: string; frequency: 'A'|'B'|'C'|'D' }[] = []
) {
  const freqTotals: Record<'A'|'B'|'C'|'D', number> = { A:0, B:0, C:0, D:0 };
  const byCode = new Map<string, { frequency: 'A'|'B'|'C'|'D'; name: string }>();
  const byName = new Map<string, { frequency: 'A'|'B'|'C'|'D'; code: string }>();
  for (const p of profiles) { byCode.set(p.code, { frequency: p.frequency, name: p.name }); byName.set(p.name, { frequency: p.frequency, code: p.code }); }
  for (const [k,v] of Object.entries(totals)) {
    if (!v) continue;
    let freq: 'A'|'B'|'C'|'D' | null = null;
    if (byCode.has(k)) freq = byCode.get(k)!.frequency;
    else if (byName.has(k)) freq = byName.get(k)!.frequency;
    else {
      const lower = k.toLowerCase();
      for (const p of profiles) {
        if (p.code.toLowerCase() === lower || p.name.toLowerCase() === lower) { freq = p.frequency; break; }
      }
    }
    if (freq) freqTotals[freq] += v;
  }
  return freqTotals;
}

function bandFor(value: number, band?: { greater_than: number; less_than: number }) {
  if (!band) return null;
  if (value > band.greater_than && value < band.less_than) return 'within';
  if (value <= band.greater_than) return 'below';
  if (value >= band.less_than) return 'above';
  return null;
}

function findTopProfile(
  totals: Record<string, number> = {},
  profiles: { code: string; name: string; frequency: 'A'|'B'|'C'|'D' }[] = []
) {
  let topKey = ''; let topVal = -Infinity;
  const codes = new Set(profiles.map(p => p.code));
  const names = new Set(profiles.map(p => p.name));
  const filtered = Object.entries(totals).filter(([k]) => codes.has(k) || names.has(k));
  for (const [k,v] of filtered) { if (v > topVal) { topKey = k; topVal = v; } }
  const match = profiles.find(p => p.code === topKey) || profiles.find(p => p.name === topKey);
  return match ? { code: match.code, name: match.name, points: topVal, frequency: match.frequency } : null;
}

export default async function Page({ params }: { params: { token: string } }) {
  const base = await getBaseUrl();
  const token = params.token;

  // Hit API endpoints *without throwing*, and show exact errors if any.
  const [rTotals, rMeta] = await Promise.all([
    safeJSON(`${base}/api/public/test/${token}/result`),
    safeJSON(`${base}/api/public/test/${token}/meta`),
  ]);

  if (!rTotals.ok) {
    return (
      <main className="mc-bg min-h-screen text-white p-6">
        <h1 className="text-2xl font-bold">Could not load result</h1>
        <p className="mt-2 text-white/70">Totals endpoint error: {rTotals.error} (HTTP {rTotals.status})</p>
      </main>
    );
  }

  const totalsResp = rTotals.json as TotalsResponse;
  const metaResp = rMeta.ok ? (rMeta.json as MetaResponse) : null;

  const taker = totalsResp.taker;
  const totals = totalsResp.totals || {};
  const profiles = metaResp?.meta?.profiles || [];
  const freqsArr = metaResp?.meta?.frequencies || [];
  const thresholds = metaResp?.meta?.thresholds || null;

  const freqTotals = deriveFrequencyTotals(totals, profiles);
  const top = findTopProfile(totals, profiles);

  const freqBands: Record<'A'|'B'|'C'|'D', string | null> = { A:null, B:null, C:null, D:null };
  if (thresholds?.frequencies) {
    (['A','B','C','D'] as const).forEach((code) => {
      const band = thresholds.frequencies![code];
      freqBands[code] = bandFor(freqTotals[code], band);
    });
  }

  let topProfileBand: string | null = null;
  if (top && thresholds?.profiles_full_test?.profiles) {
    const pBand = thresholds.profiles_full_test.profiles[top.code] || thresholds.profiles_full_test.profiles[top.name];
    if (pBand) topProfileBand = bandFor(top.points, pBand);
  }

  return (
    <main className="mc-bg min-h-screen text-white p-6">
      <h1 className="text-3xl font-bold">Your Report</h1>
      {taker && (
        <div className="mt-2 text-white/80">
          {taker.first_name} {taker.last_name} • {taker.email}
        </div>
      )}

      {!rMeta.ok && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-400/40 text-yellow-100">
          Meta endpoint error: {rMeta.error} (HTTP {rMeta.status})
        </div>
      )}

      <section className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 p-5 bg-white/5">
          <div className="text-white/70 text-sm">Top Profile</div>
          {top ? (
            <div className="mt-1">
              <div className="text-2xl font-semibold">{top.name}</div>
              <div className="text-white/70">({top.code}) • {top.points} pts</div>
              {topProfileBand && (
                <div className="mt-2 text-sm">
                  Threshold band: <span className="font-medium capitalize">{topProfileBand}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/70">Not enough data.</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 p-5 bg-white/5">
          <div className="text-white/70 text-sm">Frequency Totals</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(['A','B','C','D'] as const).map((code) => {
              const label = freqsArr.find(f => f.code === code)?.label ?? code;
              const pts = freqTotals[code] || 0;
              const bandLabel = freqBands[code] ? ` (${freqBands[code]})` : '';
              return (
                <div key={code} className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-sm text-white/70">{label} ({code})</div>
                  <div className="text-xl font-semibold">{pts}{bandLabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 p-5 bg-white/5">
        <div className="text-white/70 text-sm">Profile Totals</div>
        <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map((p) => {
            const val = totals[p.code] ?? totals[p.name] ?? 0;
            return (
              <div key={p.code} className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-sm text-white/70">{p.name} ({p.code}) — Freq {p.frequency}</div>
                <div className="text-lg font-semibold">{val}</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

