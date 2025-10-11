// apps/web/app/onboarding/branding/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

type Branding = {
  brandDesc?: string;
  background?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  font?: string;
  tone?: string;
  logoUrl?: string;
};

const defaults: Branding = {
  brandDesc:
    'Professional, modern, approachable — focused on empowerment through knowledge.',
  background: '#0b1220',
  primary: '#2d8fc4',
  secondary: '#015a8b',
  accent: '#64bae2',
  font: '',
  tone: '',
  logoUrl: '',
};

export default function Page() {
  const [data, setData] = useState<Branding>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Autosave any change
  useOnboardingAutosave('branding', data);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/onboarding', { cache: 'no-store' });
        const j = await r.json();
        setData({ ...defaults, ...(j?.onboarding?.branding ?? {}) });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveOnce() {
    setSaving(true);
    setMsg('');
    try {
      const r = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: data }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'Save failed');
      }
      setMsg('Saved ✓');
    } catch (e: any) {
      setMsg(e?.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2000);
    }
  }

  async function uploadLogo(file: File) {
    const form = new FormData();
    form.append('file', file);
    // This relies on your existing server route: /api/upload?bucket=branding
    const r = await fetch('/api/upload?bucket=branding', { method: 'POST', body: form });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || 'Bucket not found');
    }
    const j = await r.json();
    return j.url as string;
  }

  function ColorBox({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div>
        <label className="block text-sm mb-1">{label}</label>
        <input
          type="color"
          className="h-11 w-full rounded-md border p-1 bg-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  const preview = useMemo(() => {
    const bg = data.background || '#0b1220';
    const prim = data.primary || '#2d8fc4';
    const sec = data.secondary || '#015a8b';
    const acc = data.accent || '#64bae2';
    return { bg, prim, sec, acc };
  }, [data.background, data.primary, data.secondary, data.accent]);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <div className="text-sm opacity-70">Loading…</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Step 2 — Branding</h1>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-1">Branding Description</label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.brandDesc ?? ''}
              onChange={(e) => setData((d) => ({ ...d, brandDesc: e.target.value }))}
              placeholder="How should the brand feel? e.g., professional, approachable, modern…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            <ColorBox
              label="Background"
              value={data.background ?? defaults.background!}
              onChange={(v) => setData((d) => ({ ...d, background: v }))}
            />
            <ColorBox
              label="Primary"
              value={data.primary ?? defaults.primary!}
              onChange={(v) => setData((d) => ({ ...d, primary: v }))}
            />
            <ColorBox
              label="Secondary"
              value={data.secondary ?? defaults.secondary!}
              onChange={(v) => setData((d) => ({ ...d, secondary: v }))}
            />
            <ColorBox
              label="Accent"
              value={data.accent ?? defaults.accent!}
              onChange={(v) => setData((d) => ({ ...d, accent: v }))}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Font family</label>
              <input
                className="w-full rounded-md border px-3 py-2 bg-white text-black"
                value={data.font ?? ''}
                onChange={(e) => setData((d) => ({ ...d, font: e.target.value }))}
                placeholder='e.g., "Inter", "Poppins"'
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Logo</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const url = await uploadLogo(f);
                      setData((d) => ({ ...d, logoUrl: url }));
                    } catch (err: any) {
                      alert(err?.message || 'Upload failed');
                    }
                  }}
                />
                {data.logoUrl ? (
                  <span className="text-xs opacity-70">Uploaded ✓</span>
                ) : (
                  <span className="text-xs opacity-60">No file chosen</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Voice &amp; Tone</label>
            <textarea
              rows={4}
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.tone ?? ''}
              onChange={(e) => setData((d) => ({ ...d, tone: e.target.value }))}
              placeholder="e.g., clear, confident, practical, friendly"
            />
          </div>

          <div className="flex items-center gap-3">
            <a className="px-4 py-2 rounded-xl border" href="/onboarding/company">
              Back
            </a>
            <button
              onClick={saveOnce}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & Next'}
            </button>
            <a className="px-4 py-2 rounded-xl border" href="/onboarding/goals">
              Next
            </a>
            {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          </div>
        </div>

        {/* Right: report preview */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: preview.bg,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-lg"
                style={{ background: preview.prim }}
                aria-hidden
              />
              <div className="text-white/80 text-sm">Report Preview</div>
            </div>
            <span className="text-xs text-white/60">Your Logo</span>
          </div>

          <div className="mt-4 text-white/80 text-sm">
            {data.brandDesc ||
              'Professional, modern, approachable — focused on empowerment through knowledge.'}
          </div>

          <h2 className="mt-6 text-2xl font-bold" style={{ color: preview.acc }}>
            Signature Profile Report
          </h2>

          <p className="mt-2 text-white/80">
            Clear, confident, and practical guidance that reflects your brand voice.
          </p>

          <div className="mt-6 flex items-center gap-4 text-white/70 text-sm">
            <Dot c={preview.acc} label="Accent" />
            <Dot c={preview.prim} label="Primary" />
            <Dot c={preview.sec} label="Secondary" />
            <Dot c="#ffffff" label="Background" className="opacity-70" />
          </div>
        </div>
      </div>
    </main>
  );
}

function Dot({ c, label, className = '' }: { c: string; label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="inline-block h-3 w-3 rounded-full border" style={{ background: c }} />
      <span className="text-xs">{label}</span>
    </div>
  );
}
