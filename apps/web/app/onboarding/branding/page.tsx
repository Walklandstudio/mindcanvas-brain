'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useOnboardingAutosave from '../_lib/useOnboardingAutosave';
import { createClient } from '@supabase/supabase-js';

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

const supabase =
  typeof window !== 'undefined'
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

/* ---------------------------- data loaders/savers --------------------------- */

async function loadBranding(): Promise<Branding> {
  const res = await fetch('/api/onboarding/get?step=branding', { cache: 'no-store' });
  if (!res.ok) return {};
  const json = await res.json().catch(() => ({}));
  return (json?.data as Branding) ?? {};
}

async function saveBranding(payload: Branding) {
  await fetch('/api/onboarding/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'branding', data: payload }),
  });
}

/* --------------------------------- helpers -------------------------------- */

function publicUrlFor(path: string | null | undefined) {
  if (!path || !supabase) return '';
  const { data } = supabase.storage.from('branding').getPublicUrl(path);
  return data?.publicUrl ?? '';
}

async function uploadLogo(file: File): Promise<string> {
  if (!supabase) return '';

  // Keep the path predictable per-user; fall back if we can’t get a user id
  let userId = 'current';
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? 'current';
  } catch {
    /* no-op */
  }

  const ext = file.name.split('.').pop() || 'png';
  const path = `orgs/${userId}/logo.${ext}`;

  // upsert: true lets us replace an existing file without failing
  const { error } = await supabase.storage.from('branding').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/png',
  });
  if (error) throw error;

  return publicUrlFor(path);
}

/* --------------------------------- page ----------------------------------- */

export default function BrandingPage() {
  const [data, setData] = useState<Branding>({
    brandDesc:
      'Professional, modern, approachable — focused on empowerment through knowledge.',
    background: '#2d8fc4',
    primary: '#64bae2',
    secondary: '#f0a432',
    accent: '#2b2b2b',
    font: '',
    tone:
      'Inspiring, supportive, and professional. Clear and friendly with practical guidance.',
    logoUrl: '',
  });

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const initial = await loadBranding();
        if (initial && Object.keys(initial).length) {
          setData((d) => ({ ...d, ...initial }));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const onSave = useCallback((d: Branding) => saveBranding(d), []);
  useOnboardingAutosave(data, onSave, 500);

  const onLogoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadLogo(f);
      setData((d) => ({ ...d, logoUrl: url }));
    } catch (err: any) {
      alert(err?.message || 'Logo upload failed');
    }
  }, []);

  const preview = useMemo(() => {
    // A lightweight, AI-styled preview paragraph from branding inputs
    const desc = data.brandDesc?.trim() || '';
    const tone = data.tone?.trim() || '';
    return (
      (desc &&
        `${desc} This report emphasizes clarity and practical guidance tailored to your audience.`) ||
      'Your report preview will reflect your branding choices.'
    ) + (tone ? ` Tone: ${tone}` : '');
  }, [data.brandDesc, data.tone]);

  const chip = (label: string, color?: string) => (
    <span
      className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs"
      style={{ background: 'rgba(255,255,255,0.08)' }}
      key={label}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color || '#999' }}
      />
      {label}
    </span>
  );

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 p-6 text-white md:grid-cols-2">
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Step 2 — Branding</h1>

        <div className="mb-4 flex flex-col gap-2">
          <label className="text-sm opacity-80">Branding Description</label>
          <textarea
            className="min-h-[96px] rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.brandDesc ?? ''}
            onChange={(e) => setData((d) => ({ ...d, brandDesc: e.target.value }))}
            placeholder="How your brand should feel in the report…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorField
            label="Background"
            value={data.background ?? ''}
            onChange={(v) => setData((d) => ({ ...d, background: v }))}
          />
          <ColorField
            label="Primary"
            value={data.primary ?? ''}
            onChange={(v) => setData((d) => ({ ...d, primary: v }))}
          />
          <ColorField
            label="Secondary"
            value={data.secondary ?? ''}
            onChange={(v) => setData((d) => ({ ...d, secondary: v }))}
          />
          <ColorField
            label="Accent"
            value={data.accent ?? ''}
            onChange={(v) => setData((d) => ({ ...d, accent: v }))}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Font family</label>
            <input
              className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
              value={data.font ?? ''}
              onChange={(e) => setData((d) => ({ ...d, font: e.target.value }))}
              placeholder={`e.g., "Inter", "Poppins"`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Logo</label>
            <input
              type="file"
              accept="image/*"
              className="rounded-md border border-white/10 bg-white px-3 py-2 text-black file:mr-3 file:rounded file:border-0 file:bg-black file:px-3 file:py-2 file:text-white"
              onChange={onLogoChange}
            />
            {data.logoUrl ? (
              <div className="mt-1 text-xs opacity-75">Saved ✓</div>
            ) : (
              <div className="mt-1 text-xs opacity-60">No file chosen</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-sm opacity-80">Voice & Tone</label>
          <textarea
            className="min-h-[120px] rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.tone ?? ''}
            onChange={(e) => setData((d) => ({ ...d, tone: e.target.value }))}
            placeholder="e.g., clear, confident, practical, friendly"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <a href="/onboarding/company" className="rounded-md bg-white/10 px-4 py-2">
            Back
          </a>
          <a href="/onboarding/goals" className="rounded-md bg-white px-4 py-2 text-black">
            Save & Next
          </a>
        </div>
      </div>

      {/* Preview */}
      <aside className="rounded-2xl border border-white/10 p-6">
        <div
          className="rounded-xl p-6"
          style={{ background: data.background || '#0e2a3b' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div
              className="h-8 w-8 rounded-lg"
              style={{ background: data.primary || '#64bae2' }}
            />
            <div className="text-sm opacity-80">Your Logo</div>
          </div>

          <h2
            className="mb-2 text-2xl font-bold"
            style={{ color: data.primary || '#64bae2' }}
          >
            Signature Profile Report
          </h2>

          <p className="mb-4 leading-relaxed opacity-95">{preview}</p>

          <div className="flex flex-wrap gap-2">
            {chip('Accent', data.accent)}
            {chip('Primary', data.primary)}
            {chip('Secondary', data.secondary)}
            {chip('Background', data.background)}
          </div>

          {data.logoUrl && (
            <div className="mt-4">
              <img
                src={data.logoUrl}
                alt="Uploaded logo"
                className="h-12 w-auto rounded-md bg-white/80 p-1"
              />
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}

/* ---------------------------- small color input ---------------------------- */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm opacity-80">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-white/10 bg-white px-3 py-2 text-black"
          placeholder="#015a8b"
        />
      </div>
    </div>
  );
}

function normalizeHex(v: string) {
  const hex = (v || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : '#000000';
}
