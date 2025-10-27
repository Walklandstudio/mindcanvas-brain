// apps/web/app/portal/[slug]/tests/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TestRow = { id: string; name: string; slug: string; status: string };

export default async function Page({ params }: { params: { slug: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/org/${params.slug}/tests`, { cache: 'no-store' });
  const j = await res.json();
  if (!j.ok) return <div className="p-6 text-red-300">Error: {j.error}</div>;
  const tests: TestRow[] = j.tests ?? [];

  return (
    <div className="p-6 space-y-4 text-white">
      <h1 className="text-2xl font-semibold">Tests</h1>
      {tests.length === 0 ? (
        <div className="text-white/70">No tests yet.</div>
      ) : (
        <ul className="space-y-2">
          {tests.map(t => (
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
}
