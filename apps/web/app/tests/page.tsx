export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TestRow = {
  id: string;
  name: string;
  mode: 'free' | 'full';
  question_ids: number[];
  created_at: string;
};

async function loadTests(): Promise<{ tests: TestRow[] }> {
  const r = await fetch('/api/admin/tests', { cache: 'no-store' });
  if (!r.ok) throw new Error('failed');
  return r.json();
}

export default async function TestsIndex() {
  const { tests } = await loadTests();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tests</h1>
          <p className="text-sm text-slate-300 mt-1">Create and share Free or Full tests.</p>
        </div>
        <div className="flex gap-3">
          <a
            className="rounded-2xl px-4 py-2 text-sm"
            href="/tests/new?mode=free"
            style={{ background:'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
          >
            Create Free Test
          </a>
          <a
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
            href="/tests/new?mode=full"
          >
            Create Full Test
          </a>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        {tests.length === 0 ? (
          <div className="text-sm text-slate-400">No tests yet.</div>
        ) : (
          <ul className="space-y-3">
            {tests.map(t => (
              <li key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium">{t.name}</div>
                    <div className="text-xs text-slate-400">
                      {t.mode.toUpperCase()} • {t.question_ids.length} questions • {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShareLinkButton id={t.id} />
                    <a
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm"
                      href={`/tests/new?edit=${t.id}`}
                      title="Open Builder"
                    >
                      Open Builder
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ShareLinkButton({ id }: { id: string }) {
  const link = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/take?test=${id}`;
  return (
    <button
      className="rounded-xl px-3 py-1.5 text-sm"
      style={{ background:'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
      onClick={() => {
        navigator.clipboard.writeText(link);
        alert('Share link copied to clipboard:\n' + link);
      }}
      title="Copy share link"
    >
      Share Link
    </button>
  );
}
