'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Frequency = {
  id: string;
  framework_id: string;
  code: 'A'|'B'|'C'|'D';
  name: string;
  color: string;
  description?: string;
};

type Profile = {
  id: string;
  framework_id: string;
  code: number;
  name: string;
  primary_frequency: 'A'|'B'|'C'|'D';
  description?: string;
  color?: string;
  icon?: string;
};

export default function FrameworkEditor() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [frameworkId, setFrameworkId] = useState<string | null>(null);
  const [freqs, setFreqs] = useState<Frequency[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function load() {
    setLoading(true);
    const { data: s } = await sb.auth.getSession();
    const r = await fetch('/api/framework/get', {
      headers: { Authorization: `Bearer ${s.session?.access_token}` }
    });
    const j = await r.json();
    setFrameworkId(j?.data?.framework?.id ?? null);
    setFreqs(j?.data?.frequencies ?? []);
    setProfiles(j?.data?.profiles ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    if (!frameworkId) { setMsg('No framework found. Generate a framework first.'); return; }
    setSaving(true);
    setMsg('Saving…');
    const { data: s } = await sb.auth.getSession();
    const r = await fetch('/api/framework/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token}` },
      body: JSON.stringify({
        framework_id: frameworkId,
        frequencies: freqs.map(f => ({ id: f.id, name: f.name, color: f.color, description: f.description })),
        profiles: profiles.map(p => ({
          id: p.id,
          name: p.name,
          primary_frequency: p.primary_frequency,
          description: p.description,
          color: p.color ?? '#64bae2',
          icon: p.icon ?? 'User'
        }))
      })
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    setMsg(j?.ok ? '✅ Saved' : `❌ ${j?.error || 'Save failed'}`);
    if (j?.ok) await load();
  }

  async function reseed() {
    if (!frameworkId) { setMsg('No framework to reseed.'); return; }
    if (!confirm('This will replace the 8 profiles for this framework with defaults. Continue?')) return;

    setSaving(true);
    setMsg('Applying default profiles…');
    const { data: s } = await sb.auth.getSession();
    const r = await fetch('/api/framework/reseed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token}` },
      body: JSON.stringify({ framework_id: frameworkId })
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    setMsg(j?.ok ? '✅ Default profiles applied' : `❌ ${j?.error || 'Reseed failed'}`);
    if (j?.ok) await load();
  }

  if (loading) return <div className="text-sm text-slate-600">Loading framework…</div>;

  return (
    <div className="space-y-8">
      {!frameworkId && (
        <div className="p-3 rounded bg-amber-50 text-amber-800 border border-amber-200">
          No framework data yet. Use <strong>Admin → Templates</strong> to generate the 4F/8P master first.
        </div>
      )}

      {/* Frequencies */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="h2 mb-3">Frequencies (4)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {freqs.map((f) => (
            <div key={f.id} className="border rounded p-3 space-y-2">
              <div className="text-sm text-slate-600">Code {f.code}</div>
              <label className="block">
                <span className="text-xs text-slate-500">Name</span>
                <input
                  className="input"
                  value={f.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFreqs(prev => prev.map(x => x.id === f.id ? { ...x, name: v } : x));
                  }}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Color</span>
                <input
                  type="color"
                  className="input"
                  value={f.color}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFreqs(prev => prev.map(x => x.id === f.id ? { ...x, color: v } : x));
                  }}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Description</span>
                <textarea
                  className="textarea"
                  value={f.description || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFreqs(prev => prev.map(x => x.id === f.id ? { ...x, description: v } : x));
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Profiles */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="h2 mb-3">Profiles (8)</h2>
          <button className="btn btn-secondary" onClick={reseed} disabled={saving || !frameworkId}>
            Apply default 8 profiles
          </button>
        </div>

        <div className="grid gap-4">
          {profiles.map(p => (
            <div key={p.id} className="border rounded p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="text-sm text-slate-600">Code {p.code}</div>
                <label className="block">
                  <span className="text-xs text-slate-500">Name</span>
                  <input
                    className="input"
                    value={p.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, name: v } : x));
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs text-slate-500">Primary Frequency</span>
                  <select
                    className="select"
                    value={p.primary_frequency}
                    onChange={(e) => {
                      const v = e.target.value as 'A'|'B'|'C'|'D';
                      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, primary_frequency: v } : x));
                    }}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-xs text-slate-500">Profile Color</span>
                  <input
                    type="color"
                    className="input"
                    value={p.color ?? '#64bae2'}
                    onChange={(e) => {
                      const v = e.target.value;
                      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, color: v } : x));
                    }}
                  />
                </label>

                <label className="block mt-2">
                  <span className="text-xs text-slate-500">Icon (optional)</span>
                  <input
                    className="input"
                    placeholder="e.g. User, Star, Target"
                    value={p.icon ?? 'User'}
                    onChange={(e) => {
                      const v = e.target.value;
                      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, icon: v } : x));
                    }}
                  />
                </label>
              </div>

              <div className="md:col-span-1">
                <label className="block">
                  <span className="text-xs text-slate-500">Description</span>
                  <textarea
                    className="textarea"
                    value={p.description || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, description: v } : x));
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn" onClick={save} disabled={saving || !frameworkId}>Save Changes</button>
        {msg && <div className="text-sm text-slate-600">{msg}</div>}
      </div>
    </div>
  );
}
