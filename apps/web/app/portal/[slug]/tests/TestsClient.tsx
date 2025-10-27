'use client';

import { useEffect, useState } from 'react';

type TestRow = { id: string; name: string; slug: string; status: string };

export default function TestsClient({ slug }: { slug: string }) {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const r = await fetch(`/api/org/${slug}/tests`, { cache: 'no-store' });
        if (!alive) return;

        if (!r.ok) {
          const text = await r.text().catch(() => '');
          setError(`Failed to load tests (HTTP ${r.status})${text ? ` — ${text}` : ''}`);
          setTests([]);
          return;
        }

        const j = await r.json().catch(() => ({}));
        if (!j?.ok) {
          setError(j?.error || 'Unknown error');
          setTests([]);
          return;
        }

        setTests(Array.isArray(j.tests) ? j.tests : []);
      } catch (e: any) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="p-6 space-y-4 text-white">
      <h1 className="text-2xl font-semibold">Tests</h1>

      {loading && <div className="text-white/70">Loading…</div>}
      {!loading && error && <div className="text-red-300">{error}</div>}

      {!loading && !error && (
        tests.length === 0 ? (
          <div className="text-white/70">No tests yet.</div>
        ) : (
          <ul className="space-y-2">
            {tests.map((t) => (
              <li
                key={t.id}
                className="border border-white/10 rounded p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-white/60 uppercase">{t.status}</div>
                </div>
                <a className="underline" href={`/portal/${slug}/tests/${t.id}`}>Open</a>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
