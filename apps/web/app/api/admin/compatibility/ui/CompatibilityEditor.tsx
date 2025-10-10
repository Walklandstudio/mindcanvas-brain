// apps/web/app/admin/compatibility/ui/CompatibilityEditor.tsx
'use client';
import { useMemo, useState } from 'react';

type Profile = { id: string; name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };

type Pair = { a: string; b: string; score: number };

type Props = { profiles: Profile[]; initialPairs: Pair[] };

export default function CompatibilityEditor({ profiles, initialPairs }: Props) {
  const ids = profiles.map(p => p.id);
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const { a, b, score } of initialPairs || []) {
      m[key(a,b)] = score;
      m[key(b,a)] = score; // enforce symmetry on load
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const options = [0, 20, 40, 60, 80, 100];

  function key(a: string, b: string) { return `${a}__${b}`; }

  function setPair(a: string, b: string, score: number) {
    setScores(prev => ({ ...prev, [key(a,b)]: score, [key(b,a)]: score }));
  }

  async function save() {
    setSaving(true);
    try {
      const pairs: Pair[] = [];
      for (const a of ids) {
        for (const b of ids) {
          if (a === b) continue;
          const s = scores[key(a,b)] ?? 0;
          // Only push upper triangle to avoid duplicates
          if (ids.indexOf(a) < ids.indexOf(b)) {
            pairs.push({ a, b, score: s });
          }
        }
      }
      const res = await fetch('/api/admin/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs })
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error || 'Save failed');
        return;
      }
      alert('Compatibility saved');
    } finally {
      setSaving(false);
    }
  }

  const grid = useMemo(() => profiles, [profiles]);

  return (
    <div className="mt-6">
      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Profile</th>
              {grid.map(p => (
                <th key={p.id} className="p-2 text-center whitespace-nowrap">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 font-medium whitespace-nowrap">{row.name}</td>
                {grid.map((col, ci) => {
                  if (row.id === col.id) {
                    return <td key={col.id} className="p-2 text-center text-gray-400">—</td>;
                  }
                  const k = `${row.id}__${col.id}`;
                  const v = scores[k] ?? 0;
                  const disabled = ri > ci; // edit only upper triangle
                  return (
                    <td key={col.id} className="p-1 text-center">
                      <select
                        disabled={disabled}
                        value={v}
                        onChange={e => setPair(row.id, col.id, Number(e.target.value))}
                        className={`border rounded-md px-2 py-1 ${disabled ? 'bg-gray-50 text-gray-400' : ''}`}
                      >
                        {options.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60 shadow"
        >
          {saving ? 'Saving…' : 'Save Matrix'}
        </button>
      </div>
    </div>
  );
}