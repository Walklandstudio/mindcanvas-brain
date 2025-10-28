'use client';

import { useEffect, useState } from 'react';

type Totals = Record<string, number>;

export default function ResultClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [totals, setTotals] = useState<Totals>({});
  const [firstName, setFirstName] = useState<string>('');

  async function fetchJson(url: string, init?: RequestInit) {
    const r = await fetch(url, { cache: 'no-store', ...init });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = (await r.text()).slice(0, 600);
      throw new Error(`HTTP ${r.status} – non-JSON response:\n${text}`);
    }
    const j = await r.json();
    if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        // Client-side relative fetch avoids SSR/middleware auth issues
        const j = await fetchJson(`/api/public/test/${token}/result`);
        if (!alive) return;
        setTotals(j.totals || {});
        setFirstName(j?.taker?.first_name || '');
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  if (loading) {
    return <div className="mc-bg min-h-screen text-white p-6">Loading your report…</div>;
  }
  if (err) {
    return (
      <div className="mc-bg min-h-screen text-white p-6 space-y-3">
        <h1 className="text-3xl font-bold">Your Report</h1>
        <div className="text-white/80">Could not load result.</div>
        <pre className="p-3 rounded bg-white text-black whitespace-pre-wrap border">{err}</pre>
        <div className="text-white/70 text-sm">
          Debug: <a className="underline" href={`/api/public/test/${token}/result`} target="_blank">/api/public/test/{token}/result</a>
        </div>
      </div>
    );
  }

  const entries = Object.entries(totals).sort((a,b)=> (b[1] as number) - (a[1] as number));
  const top = entries[0]?.[0];

  return (
    <div className="mc-bg min-h-screen text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">Your Report</h1>
      <div className="text-white/80">
        {firstName ? `Thanks, ${firstName}. ` : ''}Here are your results.
      </div>

      {entries.length === 0 ? (
        <div className="text-white/70">No scores yet. Did you submit the test?</div>
      ) : (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-lg font-semibold">Top Profile</div>
            <div className="text-2xl mt-1">{top}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-lg font-semibold mb-3">Profile Breakdown</div>
            <ul className="space-y-2">
              {entries.map(([profile, pts]) => (
                <li key={profile} className="flex justify-between">
                  <span>{profile}</span>
                  <span className="font-mono">{pts as number}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
