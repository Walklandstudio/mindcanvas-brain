'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Q = { id: string; text: string; type: string; order: number };

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

    // test name
    const t = await supabase.from('tests').select('name').eq('id', testId).maybeSingle();
    if (t.data?.name) setName(t.data.name);

    const res = await fetch(`/api/tests/${testId}/questions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await res.json();
    if (j?.ok) setQs(j.data);
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
      setQs([...qs, j.data].sort((a,b) => a.order - b.order));
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
    if (j?.ok) setMsg('✅ Order saved');
    else setMsg('❌ ' + (j?.error || 'failed'));
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
        <input
          className="flex-1 rounded-md border px-3 py-2"
          placeholder="Question text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          required
        />
        <button className="rounded-md bg-black px-4 py-2 text-white">Add</button>
      </form>

      {msg && <div className="text-sm">{msg}</div>}

      <section className="rounded-lg border bg-white divide-y">
        {qs.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No questions yet.</div>
        ) : qs.map((q, i) => (
          <div key={q.id} className="flex items-start justify-between p-4">
            <div className="text-sm">
              <div className="text-gray-500">#{i + 1}</div>
              <div className="font-medium">{q.text}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => move(i, -1)} className="rounded-md border px-2 py-1 text-sm">↑</button>
              <button onClick={() => move(i, +1)} className="rounded-md border px-2 py-1 text-sm">↓</button>
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button onClick={saveOrder} className="rounded-md border px-4 py-2">Save Order</button>
        <a className="text-sm underline" href={`/tests/${testId}/preview`} onClick={(e)=>e.preventDefault()}>
          (Preview coming in Step 8)
        </a>
      </div>
    </main>
  );
}
