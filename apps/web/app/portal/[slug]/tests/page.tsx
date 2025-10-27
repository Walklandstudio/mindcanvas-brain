export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getBaseUrl } from '@/lib/baseUrl';

type TestRow = { id: string; name: string; slug: string; status: string };

export default async function TestsPage({ params }: { params: { slug: string } }) {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/org/${params.slug}/tests`, { cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Tests API error', res.status, text);
      return <div className="p-6 text-red-300">Failed to load tests (HTTP {res.status})</div>;
    }

    const j = await res.json().catch(() => ({}));
    if (!j.ok) {
      console.error('Tests API payload error:', j.error);
      return <div className="p-6 text-red-300">Error: {j.error}</div>;
    }

    const tests: TestRow[] = Array.isArray(j.tests) ? j.tests : [];

    return (
      <div className="p-6 space-y-4 text-white">
        <h1 className="text-2xl font-semibold">Tests</h1>
        {tests.length === 0 ? (
          <div className="text-white/70">No tests yet.</div>
        ) : (
          <ul className="space-y-2">
            {tests.map((t) => (
              <li key={t.id} className="border border-white/10 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-white/60 uppercase">{t.status}</div>
                </div>
                <a className="underline" href={`/portal/${params.slug}/tests/${t.id}`}>Open</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } catch (e: any) {
    console.error('TestsPage exception', e);
    return <div className="p-6 text-red-300">Server error while rendering Tests page.</div>;
  }
}
