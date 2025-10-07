'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type P = { id: string; key: string; name: string };
type ContentMap = Record<string, any>;

const DEFAULT_SECTIONS = ['intro','strengths','challenges','guidance','coaching_prompts','visibility_strategy'] as const;

export default function AdminReportsPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();

  const [profiles, setProfiles] = useState<P[]>([]);
  const [selKey, setSelKey] = useState<string>('');
  const [sectionsOrder, setSectionsOrder] = useState<string[]>([...DEFAULT_SECTIONS]);
  const [content, setContent] = useState<ContentMap>({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function authToken() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace('/login'); throw new Error('no session'); }
    return data.session.access_token;
  }

  useEffect(() => {
    (async () => {
      const token = await authToken();

      // load profiles (must exist first)
      const p = await fetch('/api/admin/profiles', { headers: { Authorization: `Bearer ${token}` } });
      const pj = await p.json();
      if (pj?.ok) setProfiles((pj.data || []).map((x: any) => ({ id: x.id, key: x.key, name: x.name })));

      // load content + template
      const r = await fetch('/api/admin/profile-content', { headers: { Authorization: `Bearer ${token}` } });
      const rj = await r.json();
      if (rj?.ok) {
        const map: ContentMap = {};
        for (const row of (rj.data.contents || [])) map[row.profile_key] = row.sections || {};
        setContent(map);
        if (Array.isArray(rj.data.template?.sections_order) && rj.data.template.sections_order.length) {
          setSectionsOrder(rj.data.template.sections_order);
        }
      }

      setLoading(false);
    })().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // default select first profile
    if (!selKey && profiles.length) setSelKey(profiles[0].key);
  }, [profiles, selKey]);

  const current = useMemo(() => content[selKey] || {}, [content, selKey]);

  function setSection(name: string, val: string) {
    setContent({ ...content, [selKey]: { ...current, [name]: val } });
  }

  async function saveContent() {
    setMsg('');
    const token = await authToken();
    const body = { profile_key: selKey, sections: content[selKey] || {} };
    const r = await fetch('/api/admin/profile-content', {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    setMsg(j?.ok ? '✅ Saved content' : '❌ ' + (j?.error || 'failed'));
  }

  async function saveTemplate() {
    setMsg('');
    const token = await authToken();
    const r = await fetch('/api/admin/profile-content', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sections_order: sectionsOrder, name: 'Default' })
    });
    const j = await r.json();
    setMsg(j?.ok ? '✅ Saved template order' : '❌ ' + (j?.error || 'failed'));
  }

  function move(idx: number, dir: -1|1) {
    const arr = [...sectionsOrder];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp;
    setSectionsOrder(arr);
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Report Content</h1>
        <nav className="flex gap-3 text-sm">
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/admin/profiles">Profiles</a>
        </nav>
      </header>

      {profiles.length === 0 ? (
        <div className="rounded-lg border bg-white p-4">
          Seed profiles first on the <a className="underline" href="/admin/profiles">Profiles page</a>.
        </div>
      ) : (
        <>
          {/* Template order */}
          <section className="rounded-lg border bg-white p-4 space-y-3">
            <div className="font-medium">Section Order</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {sectionsOrder.map((s, i) => (
                <div key={s} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="text-sm">{s}</div>
                  <div className="flex gap-1">
                    <button onClick={() => move(i,-1)} className="rounded-md border px-2 py-1 text-sm">↑</button>
                    <button onClick={() => move(i,+1)} className="rounded-md border px-2 py-1 text-sm">↓</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={saveTemplate} className="rounded-md border px-3 py-1 text-sm">Save Order</button>
          </section>

          {/* Profile selector + content editor */}
          <section className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="font-medium">Profile Content</div>
              <select
                value={selKey}
                onChange={(e) => setSelKey(e.target.value)}
                className="rounded-md border px-2 py-1"
              >
                {profiles.map(p => <option key={p.id} value={p.key}>{p.key} · {p.name}</option>)}
              </select>
            </div>

            {sectionsOrder.map((s) => (
              <div key={s} className="space-y-1">
                <div className="text-sm text-gray-500">{s}</div>
                <textarea
                  className="w-full rounded-md border px-3 py-2"
                  rows={s === 'intro' ? 4 : 5}
                  value={current[s] || ''}
                  onChange={(e) => setSection(s, e.target.value)}
                  placeholder={`Write ${s}...`}
                />
              </div>
            ))}

            <button onClick={saveContent} className="rounded-md bg-black px-4 py-2 text-white">Save Content</button>
          </section>
        </>
      )}

      {msg && <div className="text-sm">{msg}</div>}
    </main>
  );
}
