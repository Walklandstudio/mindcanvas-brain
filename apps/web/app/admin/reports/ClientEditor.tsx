'use client';
import { useEffect, useMemo, useState } from 'react';

type Profile = { id: string; name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };
type Sections = {
  strengths?: string;
  challenges?: string;
  roles?: string;
  guidance?: string;
  visibility?: string;
};

export default function ClientEditor({
  profiles,
  drafts,
}: {
  profiles: Profile[];
  drafts: Record<string, Sections>;
}) {
  const [active, setActive] = useState<string>(profiles[0]?.id ?? '');
  const [sections, setSections] = useState<Record<string, Sections>>({ ...drafts });
  const [branding, setBranding] = useState<any>({});

  // Ensure there is a bucket for every profile
  useEffect(() => {
    setSections((prev) => {
      const copy = { ...prev };
      for (const p of profiles) if (!copy[p.id]) copy[p.id] = {};
      return copy;
    });
  }, [profiles]);

  // Load branding for live preview
  useEffect(() => {
    (async () => {
      const r = await fetch('/api/onboarding');
      const j = await r.json();
      setBranding(j.onboarding?.branding ?? {});
    })();
  }, []);

  const prof = profiles.find((p) => p.id === active);
  const value = sections[active] ?? {};

  function update(key: keyof Sections, v: string) {
    setSections((prev) => ({ ...prev, [active]: { ...prev[active], [key]: v } }));
  }

  async function save() {
    await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: active, sections: sections[active] }),
    });
    alert('Saved');
  }

  async function draft() {
    const r = await fetch('/api/admin/reports/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: active }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Draft failed');
    setSections((prev) => ({ ...prev, [active]: { ...prev[active], ...j.sections } }));
  }

  const vars = useMemo(
    () =>
      ({
        '--brand-primary': branding.primary || '#2d8fc4',
        '--brand-secondary': branding.secondary || '#015a8b',
        '--brand-accent': branding.accent || '#64bae2',
        '--brand-font': branding.font || '',
      }) as React.CSSProperties,
    [branding]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      <aside className="space-y-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={`w-full text-left rounded-xl border px-3 py-2 ${
              active === p.id ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="text-sm">{p.name}</div>
            <div className="text-xs text-slate-400">Frequency {p.frequency}</div>
          </button>
        ))}
      </aside>

      <section className="space-y-5">
        <h3 className="text-lg font-semibold">{prof?.name ?? 'Profile'}</h3>

        {(['strengths', 'challenges', 'roles', 'guidance', 'visibility'] as (keyof Sections)[]).map(
          (k) => (
            <div key={k}>
              <div className="text-sm text-slate-300 capitalize">{k}</div>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
                value={value[k] ?? ''}
                onChange={(e) => update(k, e.target.value)}
              />
            </div>
          )
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-2xl px-4 py-2 text-sm"
            style={{ background: 'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
          >
            Save Sections
          </button>
          <button
            onClick={draft}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
            title="Use AI → draft sections"
          >
            Use AI → draft sections
          </button>
        </div>

        {/* Live preview */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4" style={vars}>
          <h4
            className="text-base font-semibold"
            style={{ color: 'var(--brand-accent)', fontFamily: 'var(--brand-font)' }}
          >
            {prof?.name ?? 'Profile'} — Report Preview
          </h4>
          {Object.entries(value).map(([k, v]) =>
            v ? (
              <div key={k} className="mt-3">
                <div className="text-xs text-slate-400 capitalize">{k}</div>
                <p className="text-sm text-slate-200/90">{v}</p>
              </div>
            ) : null
          )}
        </div>
      </section>
    </div>
  );
}
