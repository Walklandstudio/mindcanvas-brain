'use client';
import { useState } from 'react';

type Profile = { id?: string; name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };

export default function FrameworkEditor({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState<Profile[]>([...initialProfiles]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  function update(i: number, patch: Partial<Profile>) {
    setProfiles(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function save() {
    setMessage('');
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/framework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles }),
      });
      if (!res.ok) {
        const { error } = await res.json(); setMessage(error ?? 'Save failed'); return;
      }
      const { profiles: saved } = await res.json();
      setProfiles(saved); setMessage('Saved ✓');
    } finally { setIsSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {profiles.map((p, i) => (
          <div key={p.id ?? i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-400">#{p.ordinal}</span>
              <select
                value={p.frequency}
                onChange={e => update(i, { frequency: e.target.value as Profile['frequency'] })}
                className="text-sm border border-white/10 bg-white/5 rounded-md px-2 py-1"
              >
                <option value="A">Frequency A</option>
                <option value="B">Frequency B</option>
                <option value="C">Frequency C</option>
                <option value="D">Frequency D</option>
              </select>
            </div>

            <input
              className="mt-3 w-full border border-white/10 bg-white/5 rounded-md px-3 py-2 text-base"
              value={p.name}
              onChange={e => update(i, { name: e.target.value })}
              placeholder={`Profile ${p.ordinal}`}
            />

            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-slate-300">Order</label>
              <input
                type="number" min={1} max={8}
                className="w-20 border border-white/10 bg-white/5 rounded-md px-2 py-1"
                value={p.ordinal}
                onChange={e => update(i, { ordinal: Math.max(1, Math.min(8, Number(e.target.value))) })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save} disabled={isSaving}
          className="px-4 py-2 rounded-2xl text-sm font-medium disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
        >
          {isSaving ? 'Saving…' : 'Save Profiles'}
        </button>
        {message && <span className="text-sm text-slate-300">{message}</span>}
      </div>

      <div className="text-xs text-slate-400">
        Tip: Two profiles per frequency is the default (8 total). Ordering controls tie-breakers.
      </div>
    </div>
  );
}
