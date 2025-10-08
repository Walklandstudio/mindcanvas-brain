'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Tmpl = { key: string; name: string; description?: string };
type TestRow = { id: string; name: string };

export default function TemplatesAdminPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();

  const [tmpls, setTmpls] = useState<Tmpl[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [selTest, setSelTest] = useState<string>('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function token() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace('/login'); throw new Error('no session'); }
    return data.session.access_token;
  }

  useEffect(() => {
    (async () => {
      // fetch templates (public GET)
      const r = await fetch('/api/admin/templates');
      const j = await r.json();
      if (j?.ok) setTmpls(j.data || []);

      // fetch tests for this org via API (auth)
      const tkn = await token();
      const t = await fetch('/api/tests', { headers: { Authorization: `Bearer ${tkn}` } });
      const tj = await t.json();
      if (tj?.ok) {
        setTests((tj.data || []).map((x: any) => ({ id: x.id, name: x.name })));
        if ((tj.data || []).length) setSelTest(tj.data[0].id);
      }

      setLoading(false);
    })().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function apply(key: string, mode: 'append'|'replace') {
    setMsg('');
    if (!selTest) { setMsg('❌ Select a test first'); return; }
    const tkn = await token();
    const r = await fetch(`/api/admin/templates/${encodeURIComponent(key)}/apply?testId=${encodeURIComponent(selTest)}&mode=${mode}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tkn}` }
    });
    const j = await r.json();
    if (j?.ok) setMsg(`✅ Applied "${key}" (${mode}) to test — ${j.added_questions} questions added`);
    else setMsg('❌ ' + (j?.error || 'apply failed'));
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Industry Templates</h1>
        <nav className="flex gap-3 text-sm">
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/tests">Tests</a>
        </nav>
      </header>

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <div className="text-sm text-gray-600">Select a test to apply templates to</div>
        <select className="rounded-md border px-3 py-2" value={selTest} onChange={(e)=>setSelTest(e.target.value)}>
          {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </section>

      <section className="rounded-lg border bg-white divide-y">
        {tmpls.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No templates found.</div>
        ) : tmpls.map(t => (
          <div key={t.key} className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-gray-600">{t.description || ''}</div>
              <div className="text-xs text-gray-500 mt-1">Key: {t.key}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => apply(t.key, 'append')} className="rounded-md border px-3 py-1 text-sm">Apply (Append)</button>
              <button onClick={() => apply(t.key, 'replace')} className="rounded-md border px-3 py-1 text-sm">Apply (Replace)</button>
            </div>
          </div>
        ))}
      </section>

      {msg && <div className="text-sm">{msg}</div>}
    </main>
  );
}
