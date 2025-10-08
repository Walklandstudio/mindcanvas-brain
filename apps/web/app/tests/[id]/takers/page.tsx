'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  team: string;
  team_function: string;
  created_at: string;
  profile_key: string;
};

export default function TakersPage(props: any) {
  const testId = (props?.params?.id as string) || '';
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function token() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace('/login'); throw new Error('no session'); }
    return data.session.access_token;
  }

  async function load() {
    const t = await token();
    const r = await fetch(`/api/tests/${testId}/takers`, { headers: { Authorization: `Bearer ${t}` }});
    const j = await r.json();
    if (j?.ok) setRows(j.data || []);
    setLoading(false);
  }

  useEffect(() => { load().catch(()=>{}); /* eslint-disable-next-line */ }, [testId]);

  async function exportCsv() {
    setMsg('');
    const t = await token();
    const r = await fetch(`/api/tests/${testId}/takers/export`, { headers: { Authorization: `Bearer ${t}` }});
    if (!r.ok) {
      const j = await r.json().catch(()=>({error:'export failed'}));
      setMsg('❌ ' + (j.error || 'export failed'));
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'takers.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Test Takers</h1>
        <nav className="flex gap-3 text-sm">
          <a className="underline" href="/tests">Back to Tests</a>
          <button onClick={exportCsv} className="rounded-md border px-3 py-1 text-sm">Export CSV</button>
        </nav>
      </header>

      {msg && <div className="text-sm">{msg}</div>}

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-600">No takers yet.</div>
      ) : (
        <section className="rounded-lg border bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Function</th>
                <th className="px-3 py-2">Profile</th>
                <th className="px-3 py-2">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-3 py-2">{r.email || '—'}</td>
                  <td className="px-3 py-2">{r.phone || '—'}</td>
                  <td className="px-3 py-2">{r.company || '—'}</td>
                  <td className="px-3 py-2">{r.team || '—'}</td>
                  <td className="px-3 py-2">{r.team_function || '—'}</td>
                  <td className="px-3 py-2">{r.profile_key || '—'}</td>
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
