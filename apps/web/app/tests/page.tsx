import Link from 'next/link';

type TestRow = {
  id: string;
  name: string;
  mode: 'free' | 'full';
  token: string;
  created_at: string;
};

function sample(): TestRow[] {
  return [
    { id: '1', name: 'Signature Free', mode: 'free', token: 'free-abc123', created_at: '2025-10-11' },
    { id: '2', name: 'Signature Full', mode: 'full', token: 'full-xyz789', created_at: '2025-10-11' },
  ];
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TestsIndex() {
  const rows = sample();

  return (
    <main className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tests</h1>
          <p className="text-sm text-white/70">
            Create and manage tests. Share links for live taking and open the builder to edit.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/tests/new?mode=free" className="rounded-xl bg-brand-500/80 px-4 py-2 text-sm hover:bg-brand-500">
            Create Free Test
          </Link>
          <Link href="/tests/new?mode=full" className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/5">
            Create Full Test
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-sm">
          <thead className="text-left text-white/70">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/t/${r.token}`;
              return (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 uppercase">{r.mode}</td>
                  <td className="p-3">{r.created_at}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (shareUrl) navigator.clipboard.writeText(shareUrl);
                          alert('Share link copied');
                        }}
                        className="rounded-lg bg-white/10 px-3 py-1 hover:bg-white/15"
                      >
                        Share Link
                      </button>
                      <Link
                        href={`/tests/${r.id}/builder`}
                        className="rounded-lg border border-white/20 px-3 py-1 hover:bg-white/5"
                      >
                        Open Builder
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
