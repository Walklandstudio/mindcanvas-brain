'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type TestRow = { id: string; name: string; status: string; created_at: string };

export default function TestsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [rows, setRows] = useState<TestRow[]>([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.replace('/login');
      const token = sess.session.access_token;

      const res = await fetch('/api/tests', { headers: { Authorization: `Bearer ${token}` }});
      const j = await res.json();
      if (j?.ok) setRows(j.data);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTest(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.replace('/login');
    const token = sess.session.access_token;

    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    const j = await res.json();
    if (j?.ok) {
      setRows([j.data, ...rows]);
      setName('');
      setMsg('✅ Test created');
    } else setMsg('❌ ' + (j?.error || 'failed'));
  }

  async function mintLink(id: string, mode: 'free' | 'full') {
    setMsg('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.replace('/login');
    const token = sess.session.access_token;

    const res = await fetch(`/api/tests/${id}/link?mode=${mode}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await res.json();
    if (!j?.ok) return setMsg('❌ ' + (j?.error || 'failed'));

    const basePath = process.env.NEXT_PUBLIC_APP_ENV === 'prod' ? '/mindcanvas' : '';
    const full = `${window.location.origin}${basePath}/t/${j.token}`;
    await navigator.clipboard.writeText(full).catch(() => {});
    setMsg(`🔗 Copied ${mode.toUpperCase()} link: ${full}`);
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <nav className="flex items-center gap-3 text-sm">
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/analytics">Analytics</a>
        </nav>
      </header>

      <form onSubmit={createTest} className="flex gap-2">
        <input className="flex-1 rounded-md border px-3 py-2" placeholder="New test name"
               value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="rounded-md bg-black px-4 py-2 text-white">Create</button>
      </form>

      {msg && <div className="text-sm">{msg}</div>}

      <section className="rounded-lg border bg-white">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No tests yet.</div>
        ) : rows.map(r => (
          <div key={r.id} className="flex items-center justify-between border-b p-4 last:border-b-0">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-gray-500">{r.status} • {new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`/tests/${r.id}/builder`} className="rounded-md border px-3 py-1 text-sm">Build Questions</a>
              <a href={`/tests/${r.id}/takers`} className="rounded-md border px-3 py-1 text-sm">View Takers</a>
              <button onClick={() => mintLink(r.id, 'free')} className="rounded-md border px-3 py-1 text-sm">Copy Free Link</button>
              <button onClick={() => mintLink(r.id, 'full')} className="rounded-md border px-3 py-1 text-sm">Copy Full Link</button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
