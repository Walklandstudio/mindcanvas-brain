'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Profile = { id: string; code: number; name: string; primary_frequency: 'A'|'B'|'C'|'D' };
type Entry   = { id: string; profile_a_id: string; profile_b_id: string; score: number; notes?: string };

export default function MatrixEditor() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [frameworkId, setFrameworkId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await sb.auth.getSession();
      const r = await fetch('/api/compat/get', { headers: { Authorization: `Bearer ${s.session?.access_token}` }});
      const j = await r.json();
      setFrameworkId(j?.data?.framework?.id ?? null);
      setProfiles(j?.data?.profiles ?? []);
      setEntries(j?.data?.entries ?? []);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lookup for quick access
  const map = useMemo(() => {
    const m = new Map<string, Entry>();
    for (const e of entries) m.set(`${e.profile_a_id}:${e.profile_b_id}`, e);
    return m;
  }, [entries]);

  function setScore(a: string, b: string, score: number) {
    const key = `${a}:${b}`;
    const existing = map.get(key);
    if (existing) {
      setEntries(prev => prev.map(x => x === existing ? { ...x, score } : x));
    } else {
      setEntries(prev => [...prev, { id: crypto.randomUUID(), profile_a_id: a, profile_b_id: b, score } as Entry]);
    }
  }

  async function save() {
    if (!frameworkId) { setMsg('No framework found. Generate framework first.'); return; }
    setSaving(true);
    setMsg('Saving…');

    // send only essential fields
    const payload = {
      framework_id: frameworkId,
      rows: entries.map(e => ({ a: e.profile_a_id, b: e.profile_b_id, score: e.score, notes: e.notes ?? '' }))
    };

    const { data: s } = await sb.auth.getSession();
    const r = await fetch('/api/compat/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token}` },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    setMsg(j?.ok ? '✅ Saved' : `❌ ${j?.error || 'Save failed'}`);
  }

  if (loading) return <div className="text-sm text-slate-600">Loading compatibility…</div>;
  if (!frameworkId) return <div className="p-3 rounded bg-amber-50 text-amber-800 border border-amber-200">No framework yet. Create one first.</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">Set scores from -100 (clashes) to +100 (great fit). Diagonal cells are disabled.</div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-slate-50 sticky left-0"></th>
              {profiles.map(p => (
                <th key={p.id} className="border p-2 text-xs text-slate-600">
                  {p.code}. {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(row => (
              <tr key={row.id}>
                <th className="border p-2 bg-slate-50 text-xs text-slate-600 sticky left-0">{row.code}. {row.name}</th>
                {profiles.map(col => {
                  const key = `${row.id}:${col.id}`;
                  const e = map.get(key);
                  const value = e?.score ?? 0;
                  const disabled = row.id === col.id;
                  return (
                    <td key={col.id} className="border p-1 text-center">
                      <input
                        type="number"
                        className="w-16 text-center input"
                        disabled={disabled}
                        min={-100}
                        max={100}
                        value={value}
                        onChange={(ev) => setScore(row.id, col.id, Number(ev.target.value))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn" onClick={save} disabled={saving}>Save Matrix</button>
        {msg && <div className="text-sm text-slate-600">{msg}</div>}
      </div>
    </div>
  );
}
