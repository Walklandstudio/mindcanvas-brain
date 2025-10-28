'use client';

import { useEffect, useState } from 'react';

export default function ResultPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      setErr('');
      try {
        const r = await fetch(`/api/public/test/${token}/result`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.ok === false) {
          throw new Error(j?.error || `HTTP ${r.status}`);
        }
        setData(j);
      } catch (e: any) {
        setErr(e?.message || 'Totals endpoint error');
      }
    })();
  }, [token]);

  if (err) return <main className="mc-bg min-h-screen text-white p-6">Could not load result<br/> {err}</main>;
  if (!data) return <main className="mc-bg min-h-screen text-white p-6">Loading…</main>;

  return (
    <main className="mc-bg min-h-screen text-white p-6 space-y-4">
      <h1 className="text-2xl font-bold">Result</h1>
      <pre className="bg-white/10 p-4 rounded-xl">{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}

