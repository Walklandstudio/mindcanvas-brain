'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type TeamRow = { name: string; count: number; profiles: Record<string, number> };

export default function TeamsPage({ params }: { params: { id: string } }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function token(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace('/login'); throw new Error('no session'); }
    return data.session.access_token;
  }

  useEffect(() => {
    (async () => {
      const tkn = await token();
      const r = await fetch(`/api/tests/${params.id}/teams`, { headers: { Authorization: `Bearer ${tkn}` }});
      const j = await r.json();
      if (j?.ok) setRows(j.data || []);
      setLoading(false);
    })().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Teams</h1>
      <div className="rounded-lg border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-center">Members</th>
              <th className="px-3 py-2 text-left">Profiles</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((t) => (
              <tr key={t.name}>
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2 text-center">{t.count}</td>
                <td className="px-3 py-2">
                  {Object.entries(t.profiles).map(([k, v]) => (
                    <span key={k} className="mr-2 inline-block rounded border px-2 py-0.5">{k}:{v}</span>
                  ))}
                </td>
                <td className="px-3 py-2 text-right">
                  <a
                    className="inline-flex items-center rounded border px-3 py-1.5 hover:bg-gray-50"
                    href={`/tests/${params.id}/teams/${encodeURIComponent(t.name)}`}
                  >
                    Open
                  </a>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No teams found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
