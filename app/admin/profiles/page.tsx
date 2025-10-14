'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type P = { id: string; key: string; freq_key: 'A'|'B'|'C'|'D'; name: string; color: string; description: string | null };

export default function AdminProfilesPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();

  const [rows, setRows] = useState<P[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function authToken() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace('/login'); throw new Error('no session'); }
    return data.session.access_token;
  }

  async function load() {
    const token = await authToken();
    const res = await fetch('/api/admin/profiles', { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    if (j?.ok) setRows(j.data || []);
    setLoading(false);
  }

  useEffect(() => { load().catch(()=>{}); /* eslint-disable-next-line */ }, []);

  async function seed() {
    setMsg('');
    const token = await authToken();
    const r = await fetch('/api/admin/profiles', { method: 'POST', headers: { Authorization: `Bearer ${token}` }});
    const j = await r.json();
    if (j?.ok) { await load(); setMsg('✅ Seeded default 8 profiles'); }
    else setMsg('❌ ' + (j?.error || 'failed'));
  }

  async function save(p: P) {
    setMsg('');
    const token = await authToken();
    const r = await fetch(`/api/admin/profiles/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: p.name, color: p.color, description: p.description, freq_key: p.freq_key })
    });
    const j = await r.json();
    if (j?.ok) setMsg('✅ Saved');
    else setMsg('❌ ' + (j?.error || 'failed'));
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <nav className="flex gap-3 text-sm">
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/admin/reports">Report Content</a>
        </nav>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-2">No profiles yet.</div>
          <button onClick={seed} className="rounded-md bg-black px-4 py-2 text-white">Seed 8 Defaults</button>
        </div>
      ) : (
        <section className="rounded-lg border bg-white divide-y">
          {rows.map((p) => (
            <div key={p.id} className="grid gap-3 p-4 sm:grid-cols-[auto,1fr,auto]">
              <div className="text-sm text-gray-500 w-16">{p.key}</div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={p.freq_key}
                    onChange={(e) => setRows(rows.map(x => x.id === p.id ? { ...x, freq_key: e.target.value as any } : x))}
                    className="rounded-md border px-2 py-1"
                  >
                    {(['A','B','C','D'] as const).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input
                    className="rounded-md border px-3 py-1"
                    value={p.name}
                    onChange={(e) => setRows(rows.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))}
                  />
                  <input
                    className="rounded-md border px-3 py-1 w-32"
                    value={p.color}
                    onChange={(e) => setRows(rows.map(x => x.id === p.id ? { ...x, color: e.target.value } : x))}
                    placeholder="#000000"
                  />
                </div>
                <textarea
                  className="w-full rounded-md border px-3 py-2"
                  rows={3}
                  placeholder="Description"
                  value={p.description || ''}
                  onChange={(e) => setRows(rows.map(x => x.id === p.id ? { ...x, description: e.target.value } : x))}
                />
              </div>
              <div className="flex items-start justify-end">
                <button onClick={() => save(p)} className="rounded-md border px-3 py-1 text-sm">Save</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {msg && <div className="text-sm">{msg}</div>}
    </main>
  );
}
