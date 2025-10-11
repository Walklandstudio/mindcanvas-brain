'use client';

import { useEffect, useMemo } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';
import { createClient } from '@supabase/supabase-js';

type Branding = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  font?: string;
  logoUrl?: string;
  tone?: string;
};

const supabase =
  typeof window !== 'undefined'
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : (null as any);

export default function Page() {
  const { data, update, saving, saveNow, loadFromServer, clearDraft } =
    useOnboardingAutosave<Branding>('branding', {});

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/onboarding', { cache: 'no-store' });
      const j = await r.json();
      loadFromServer(j.onboarding?.branding ?? {});
    })();
  }, [loadFromServer]);

  async function handleLogo(file: File | null) {
    if (!file || !supabase) return;
    const path = `branding/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from('public').upload(path, file, {
      cacheControl: '3600', upsert: false,
    });
    if (up.error) { alert(up.error.message); return; }
    const { data: pub } = supabase.storage.from('public').getPublicUrl(path);
    if (pub?.publicUrl) update('logoUrl', pub.publicUrl);
  }

  const previewStyle = useMemo(() => ({
    '--brand-primary': data.primary ?? '#2d8fc4',
    '--brand-secondary': data.secondary ?? '#015a8b',
    '--brand-accent': data.accent ?? '#64bae2',
    '--brand-bg': data.background ?? 'rgba(255,255,255,0.02)',
  }) as React.CSSProperties, [data]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Step 2 — Branding</h1>
      <p className="text-sm text-slate-300">
        Set your brand tokens. The report preview updates live on the right.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Primary</label>
              <input type="color" className="w-full h-10"
                     value={data.primary ?? '#2d8fc4'}
                     onChange={e => update('primary', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Secondary</label>
              <input type="color" className="w-full h-10"
                     value={data.secondary ?? '#015a8b'}
                     onChange={e => update('secondary', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Accent</label>
              <input type="color" className="w-full h-10"
                     value={data.accent ?? '#64bae2'}
                     onChange={e => update('accent', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Background</label>
              <input type="color" className="w-full h-10"
                     value={data.background ?? '#0b1220'}
                     onChange={e => update('background', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Font family</label>
              <input className="w-full rounded-md border px-3 py-2"
                     placeholder={`e.g., "Inter", "Poppins"`}
                     value={data.font ?? ''}
                     onChange={e => update('font', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Logo</label>
              <input type="file" accept="image/*"
                     onChange={e => handleLogo(e.target.files?.[0] ?? null)}
                     className="w-full rounded-md border px-3 py-2 bg-white" />
              {data.logoUrl && (
                <div className="mt-2 text-xs text-slate-400 break-all">
                  Saved: {data.logoUrl}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Voice &amp; Tone</label>
            <textarea rows={4}
                      className="w-full rounded-md border px-3 py-2"
                      value={data.tone ?? ''}
                      onChange={e => update('tone', e.target.value)} />
          </div>

          <div className="flex gap-3">
            <a className="px-4 py-2 rounded-xl border" href="/onboarding/company">Back</a>
            <button onClick={() => saveNow()} disabled={saving}
                    className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={async () => { await saveNow(); clearDraft(); window.location.assign('/onboarding/goals'); }}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & Next'}
            </button>
          </div>
        </div>

        {/* Live Report Preview */}
        <div>
          <div
            style={previewStyle}
            className="rounded-2xl border p-6 shadow relative overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(1200px 400px at 20% -10%, var(--brand-bg), transparent),
                              radial-gradient(800px 300px at 90% 10%, var(--brand-bg), transparent)`,
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                {data.logoUrl && (
                  <img src={data.logoUrl} alt="logo" className="h-10 w-10 object-contain rounded" />
                )}
                <h2 className="text-xl font-semibold" style={{ color: 'var(--brand-primary)' }}>
                  Signature Profile Report
                </h2>
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--brand-secondary)' }}>
                Actionable, practical guidance in your brand voice.
              </p>

              <div className="mt-4 flex items-center gap-3 text-xs">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--brand-accent)' }} />
                Accent
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                Primary
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--brand-secondary)' }} />
                Secondary
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            This preview adopts your colors, logo, and tone for reports and dashboards.
          </div>
        </div>
      </div>
    </div>
  );
}
