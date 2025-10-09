'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Q = {
  id?: string;
  label: string;
  kind: 'scale'|'text'|'single'|'multi';
  options: any; // array or [{min,max}] for scale
  weight: number;
  is_segmentation: boolean;
  active: boolean;
  display_order: number;
};

export default function QuestionEditor() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [rows, setRows] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() =>
    [...rows].sort((a,b) => a.display_order - b.display_order),
    [rows]
  );

  async function load() {
    setLoading(true);
    const { data: s } = await sb.auth.getSession();
    const r = await fetch('/api/questions/get', {
      headers: { Authorization: `Bearer ${s.session?.access_token}` }
    });
    const j = await r.json();
    setRows(j?.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    setSaving(true);
    setMsg('Saving…');
    const { data: s } = await sb.auth.getSession();
    const r = await fetch('/api/questions/save', {
      method: 'POST',
      headers: {'Content-Type':'application/json', Authorization: `Bearer ${s.session?.access_token}` },
      body: JSON.stringify({ rows })
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    setMsg(j?.ok ? '✅ Saved' : `❌ ${j?.error || 'Save failed'}`);
    if (j?.ok) await load();
  }

  async function seed() {
    if (!confirm('Seed 15 base questions + 2 segmentation examples?')) return;
    setMsg('Seeding…');
    const { data: s } = await sb.auth.getSession();
    const r = await fetch('/api/questions/seed', {
      method: 'POST',
      headers: {'Content-Type':'application/json', Authorization: `Bearer ${s.session?.access_token}` }
    });
    const j = await r.json().catch(() => ({}));
    setMsg(j?.ok ? (j?.skipped ? 'Already seeded — skipped' : '✅ Seeded') : `❌ ${j?.error || 'Seed failed'}`);
    await load();
  }

  function addRow(kind: Q['kind']) {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.display_order ?? 0), 0);
    setRows(prev => [
      ...prev,
      {
        label: 'New question',
        kind,
        options: kind === 'scale' ? [{ min: 1, max: 5 }] : [],
        weight: kind === 'text' ? 0 : 1,
        is_segmentation: kind !== 'scale', // text/single/multi default to segmentation=false? tweak as needed
        active: true,
        display_order: maxOrder + 1
      }
    ]);
  }

  function rm(id?: string, idx?: number) {
    if (!confirm('Remove this question?')) return;
    if (id) {
      // soft remove: mark inactive
      setRows(prev => prev.map(r => r.id === id ? { ...r, active: false } : r));
    } else if (typeof idx === 'number') {
      setRows(prev => prev.filter((_, i) => i !== idx));
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const list = [...sorted];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[j];
    list[j] = tmp;
    // rewrite display_order sequentially
    setRows(list.map((r, i) => ({ ...r, display_order: i + 1 })));
  }

  if (loading) return <div className="text-sm text-slate-600">Loading questions…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn" onClick={save} disabled={saving}>Save Changes</button>
        <button className="btn btn-secondary" onClick={seed}>Seed 15 Base</button>
        {msg && <div className="text-sm text-slate-600">{msg}</div>}
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="border p-2 text-left w-16">Order</th>
              <th className="border p-2 text-left">Label</th>
              <th className="border p-2">Kind</th>
              <th className="border p-2">Options / Scale</th>
              <th className="border p-2">Weight</th>
              <th className="border p-2">Seg?</th>
              <th className="border p-2">Active</th>
              <th className="border p-2 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((q, i) => (
              <tr key={q.id ?? `new-${i}`}>
                <td className="border p-2">
                  <div className="flex items-center gap-1">
                    <button className="btn btn-ghost" onClick={() => move(i,-1)}>↑</button>
                    <button className="btn btn-ghost" onClick={() => move(i, 1)}>↓</button>
                    <span className="text-xs text-slate-500 ml-1">{q.display_order}</span>
                  </div>
                </td>
                <td className="border p-2">
                  <input
                    className="input w-full"
                    value={q.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows(prev => prev.map(r => r === q ? { ...r, label: v } : r));
                    }}
                  />
                </td>
                <td className="border p-2">
                  <select
                    className="select"
                    value={q.kind}
                    onChange={(e) => {
                      const v = e.target.value as Q['kind'];
                      setRows(prev => prev.map(r => r === q ? {
                        ...r,
                        kind: v,
                        options: v === 'scale' ? [{ min: 1, max: 5 }] : [],
                        weight: v === 'text' ? 0 : r.weight
                      } : r));
                    }}
                  >
                    <option value="scale">scale</option>
                    <option value="single">single</option>
                    <option value="multi">multi</option>
                    <option value="text">text</option>
                  </select>
                </td>
                <td className="border p-2">
                  {/* simple editor: scale min/max or CSV for single/multi */}
                  {q.kind === 'scale' ? (
                    <div className="flex items-center gap-2">
                      <label className="text-xs">
                        min{' '}
                        <input
                          type="number"
                          className="input w-16"
                          value={q.options?.[0]?.min ?? 1}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRows(prev => prev.map(r => r === q ? {
                              ...r, options: [{ min: val, max: r.options?.[0]?.max ?? 5 }]
                            } : r));
                          }}
                        />
                      </label>
                      <label className="text-xs">
                        max{' '}
                        <input
                          type="number"
                          className="input w-16"
                          value={q.options?.[0]?.max ?? 5}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRows(prev => prev.map(r => r === q ? {
                              ...r, options: [{ min: r.options?.[0]?.min ?? 1, max: val }]
                            } : r));
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <input
                      className="input w-full"
                      placeholder="Comma-separated options"
                      value={Array.isArray(q.options) ? q.options.join(',') : ''}
                      onChange={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setRows(prev => prev.map(r => r === q ? { ...r, options: arr } : r));
                      }}
                    />
                  )}
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    className="input w-20 text-center"
                    value={q.weight}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setRows(prev => prev.map(r => r === q ? { ...r, weight: num } : r));
                    }}
                    disabled={q.kind === 'text'}
                    title={q.kind === 'text' ? 'Text questions are not scored' : ''}
                  />
                </td>
                <td className="border p-2 text-center">
                  <input
                    type="checkbox"
                    checked={q.is_segmentation}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setRows(prev => prev.map(r => r === q ? { ...r, is_segmentation: v } : r));
                    }}
                  />
                </td>
                <td className="border p-2 text-center">
                  <input
                    type="checkbox"
                    checked={q.active}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setRows(prev => prev.map(r => r === q ? { ...r, active: v } : r));
                    }}
                  />
                </td>
                <td className="border p-2 text-center">
                  <button className="btn btn-ghost" onClick={() => rm(q.id, i)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Add:</span>
        <button className="btn btn-ghost" onClick={() => addRow('scale')}>+ Scale</button>
        <button className="btn btn-ghost" onClick={() => addRow('single')}>+ Single</button>
        <button className="btn btn-ghost" onClick={() => addRow('multi')}>+ Multi</button>
        <button className="btn btn-ghost" onClick={() => addRow('text')}>+ Text</button>
      </div>
    </div>
  );
}
