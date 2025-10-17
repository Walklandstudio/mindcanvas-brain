'use client';
import { useMemo, useState } from 'react';

type Profile = { id: string; name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };
type Pair = { a: string; b: string; score: number };

export default function CompatibilityEditor({ profiles, initialPairs }:{
  profiles: Profile[]; initialPairs: Pair[];
}) {
  const ids = profiles.map(p => p.id);
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const { a, b, score } of initialPairs || []) {
      m[`${a}__${b}`]=score; m[`${b}__${a}`]=score;
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const options = [0, 20, 40, 60, 80, 100];

  const grid = useMemo(() => profiles, [profiles]);

  function setPair(a: string, b: string, score: number) {
    setScores(prev => ({ ...prev, [`${a}__${b}`]: score, [`${b}__${a}`]: score }));
  }

  async function save() {
    setSaving(true);
    try {
      const pairs: Pair[] = [];
      for (let i=0;i<ids.length;i++){
        for (let j=i+1;j<ids.length;j++){
          const a=ids[i], b=ids[j];
          const s = scores[`${a}__${b}`] ?? 0;
          pairs.push({ a,b,score:s });
        }
      }
      const res = await fetch('/api/admin/compatibility', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ pairs })
      });
      if (!res.ok) { const {error}=await res.json(); alert(error||'Save failed'); return; }
      alert('Compatibility saved');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="p-2 text-left">Profile</th>
              {grid.map(p => (
                <th key={p.id} className="p-2 text-center whitespace-nowrap">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="p-2 font-medium whitespace-nowrap">{row.name}</td>
                {grid.map((col, ci) => {
                  if (row.id === col.id) {
                    return <td key={col.id} className="p-2 text-center text-slate-500">—</td>;
                  }
                  const v = scores[`${row.id}__${col.id}`] ?? 0;
                  const disabled = ri > ci; // upper triangle editable
                  return (
                    <td key={col.id} className="p-1 text-center">
                      <select
                        disabled={disabled}
                        value={v}
                        onChange={e => setPair(row.id, col.id, Number(e.target.value))}
                        className={`border border-white/10 bg-white/5 rounded-md px-2 py-1
                          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button
          onClick={save} disabled={saving}
          className="px-4 py-2 rounded-2xl text-sm font-medium disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
        >
          {saving ? 'Saving…' : 'Save Matrix'}
        </button>
      </div>
    </div>
  );
}
