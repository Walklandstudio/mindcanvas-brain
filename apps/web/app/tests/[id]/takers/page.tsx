'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Taker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  team: string | null;
  team_function: string | null;
  created_at: string;
};

export default function TestTakersPage(props: any) {
  const testId = (props?.params?.id as string) || '';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  const [name, setName] = useState<string>('Test');
  const [rows, setRows] = useState<Taker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.replace('/login');

      // test meta
      const t = await supabase.from('tests').select('name').eq('id', testId).maybeSingle();
      if (t.data?.name) setName(t.data.name);

      // takers
      const takers = await supabase
        .from('test_takers')
        .select('id,first_name,last_name,email,phone,company,team,team_function,created_at')
        .eq('test_id', testId)
        .order('created_at', { ascending: false });
      setRows(takers.data || []);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Test-takers · {name}</h1>
        <nav className="flex gap-3 text-sm">
          <a className="underline" href="/tests">Back to Tests</a>
          <a className="underline" href="/analytics">Analytics</a>
        </nav>
      </header>

      <div className="rounded-lg border bg-white overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-left font-medium">Name</th>
              <th className="p-2 text-left font-medium">Email</th>
              <th className="p-2 text-left font-medium">Phone</th>
              <th className="p-2 text-left font-medium">Company</th>
              <th className="p-2 text-left font-medium">Team</th>
              <th className="p-2 text-left font-medium">Function</th>
              <th className="p-2 text-left font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-gray-600">No submissions yet.</td>
              </tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="p-2">{r.email || '—'}</td>
                <td className="p-2">{r.phone || '—'}</td>
                <td className="p-2">{r.company || '—'}</td>
                <td className="p-2">{r.team || '—'}</td>
                <td className="p-2">{r.team_function || '—'}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
