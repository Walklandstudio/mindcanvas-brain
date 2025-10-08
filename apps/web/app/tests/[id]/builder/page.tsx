'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Q = { id: string; text: string; type: 'text' | 'scale5'; order: number; scoring?: any; visible_in_free?: boolean };

export default function BuilderPage(props: any) {
  const testId = (props?.params?.id as string) || '';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  const [name, setName] = useState('Test');
  const [qs, setQs] = useState<Q[]>([]);
  const [newText, setNewText] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.replace('/login');
    const token = sess.session.access_token;

    const t = await supabase.from('tests').select('name').eq('id', testId).maybeSingle();
    if (t.data?.name) setName(t.data.name);

    const res = await fetch(`/api/tests/${testId}/questions`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    if (j?.ok) setQs(j.data.map((q: any) => ({ ...q, scoring: q.scoring || {}, visible_in_free: !!q.visible_in_free })));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [testId]);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.replace('/login');
    const token = sess.session.access_token;

    const res = await fetch(`/api/tests/${testId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: newText })
    });
    const j = await res.json();
    if (j?.ok) {
      setQs([...qs, { ...j.data, scoring: {}, visible_in_free: false }].sort((a,b) => a.order - b.order));
      setNewText('');
      setMsg('✅ Added');
    } else setMsg('❌ ' + (j?.error || 'failed'));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...qs];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setQs(next);
  }

  async function saveOrder() {
    setMsg('');
    const order = qs.map(q => q.id);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.replace('/login');
    const token = sess.session.access_token;

    const res = await fetch(`/api/tests/${testId}/questions`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order })
    });
    const j = await res.json();
    if (j?.ok) setMsg('✅ Order saved'); else setMsg('❌ ' + (j?.error || 'failed'));
  }

  async function saveQuestion(q: Q) {
    setMsg('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.replace('/login');
    const token = sess.session.access_token;

    const res = await fetch(`/api/tests/${testId}/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        text: q.text,
        type: q.type,
        scoring: q.scoring || {},
        visible_in_free: !!q.visible_in_free
      })
    });
    const j = await res.json();
    if (j?.ok) setMsg('✅ Question saved'); else setMsg('❌ ' + (j?.error || 'failed'));
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Question Builder · {name}</h1>
        <nav className="flex gap-3 text-sm">
          <a href={`/tests/${testId}/takers`} className="underline">Takers</a>
          <a href="/tests" className="underline">Back to Tests</a>
        </nav>
      </header>

      <form onSubmit={addQuestion} className="flex gap-2">
        <input className="flex-1 rounded-md border px-3 py-2" placeholder="Question text" value={newText}
               onChange={(e) => setNewText(e.target.value)} required />
        <button className="rounded-md bg-black px-4 py-2 text-white">Add</button>
      </form>

      {msg && <div className="text-sm">{msg}</div>}

      <section className="rounded-lg border bg-white divide-y">
        {qs.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No questions yet.</div>
        ) : qs.map((q, i) => (
          <div key={q.id} className="grid gap-3 p-4 sm:grid-cols-[1fr,auto]">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">#{i + 1}</div>
              <input className="w-full rounded-md border px-3 py-2"
                     value={q.text}
                     onChange={(e) => setQs(qs.map(x => x.id === q.id ? { ...x, text: e.target.value } : x))} />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  Type:
                  <select value={q.type}
                          onChange={(e) => setQs(qs.map(x => x.id === q.id ? { ...x, type: e.target.value as any } : x))}
                          className="rounded-md border px-2 py-1">
                    <option value="text">Text (qualitative)</option>
                    <option value="scale5">Scale 1–5 (scored)</option>
                  </select>
                </label>

                {q.type === 'scale5' && (
                  <div className="flex items-center gap-2">
                    <span>Weights A/B/C/D:</span>
                    {(['A','B','C','D'] as const).map(k => (
                      <input key={k} type="number" className="w-14 rounded-md border px-2 py-1"
                             value={Number(q.scoring?.[k] ?? 0)}
                             onChange={(e) => {
                               const v = Number(e.target.value || 0);
                               setQs(qs.map(x => x.id === q.id ? { ...x, scoring: { ...x.scoring, [k]: v } } : x));
                             }} />
                    ))}
                    <span className="text-xs text-gray-500">Score = (answer-3) × weight</span>
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input type="checkbox"
                         checked={!!q.visible_in_free}
                         onChange={(e) => setQs(qs.map(x => x.id === q.id ? { ...x, visible_in_free: e.target.checked } : x))} />
                  Show in Free version
                </label>
              </div>
            </div>
            <div className="flex items-start justify-end gap-2">
              <button onClick={() => move(i, -1)} className="rounded-md border px-2 py-1 text-sm">↑</button>
              <button onClick={() => move(i, +1)} className="rounded-md border px-2 py-1 text-sm">↓</button>
              <button onClick={() => saveQuestion(q)} className="rounded-md border px-3 py-1 text-sm">Save</button>
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button onClick={saveOrder} className="rounded-md border px-4 py-2">Save Order</button>
      </div>
    </main>
  );
}
