'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type Branding = {
  brandDesc?: string;
  bg?: string; primary?: string; secondary?: string; accent?: string;
  font?: string;
  tone?: string;
  logoUrl?: string;
};

const fallback: Branding = {
  brandDesc: '',
  bg: '#0b1324',
  primary: '#2d8fc4',
  secondary: '#64bae2',
  accent: '#015a8b',
  font: '',
  tone: ''
};

async function load(): Promise<Branding> {
  const res = await fetch('/api/onboarding/get?step=branding', { credentials: 'include' });
  if (!res.ok) return { ...fallback };
  const json = await res.json();
  return { ...fallback, ...(json?.data as Branding) };
}

async function save(data: Branding) {
  await fetch('/api/onboarding/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ step: 'branding', data }),
  });
}

export default function BrandingPage() {
  const router = useRouter();
  const [data, setData] = useState<Branding>(fallback);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => setData(await load()))(); }, []);

  const doSave = useCallback(async (d: Branding) => {
    setSaving(true);
    try { await save(d); } finally { setSaving(false); }
  }, []);

  const onNext = async () => { await doSave(data); router.push('/onboarding/goals'); };
  const onBack = async () => { await doSave(data); router.push('/onboarding/company'); };

  const onLogo = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/onboarding/branding/upload-logo', { method: 'POST', body: fd, credentials: 'include' });
    const json = await res.json();
    if (json?.url) setData(s => ({ ...s, logoUrl: json.url }));
    else alert(json?.error || 'Upload failed');
  };

  const swatch = (label: string, key: keyof Branding) => (
    <label className="flex flex-col gap-2">
      <span>{label}</span>
      <input
        type="color"
        className="h-10 w-full rounded-md border border-white/20 bg-transparent"
        value={(data[key] as string) ?? '#000000'}
        onChange={(e) => setData((s) => ({ ...s, [key]: e.target.value }))}
      />
    </label>
  );

  const previewCopy = useMemo(() => {
    const voice = data.tone?.trim()
      ? data.tone
      : 'Clear, confident, and practical guidance that reflects your brand voice.';
    return voice;
  }, [data.tone]);

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Step 3 — Branding</h1>
        <div className="text-sm text-white/60">{saving ? 'Saving…' : ''}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: form */}
        <div className="space-y-5">
          <label className="flex flex-col gap-2">
            <span>Branding Description</span>
            <textarea
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
              value={data.brandDesc ?? ''}
              onChange={(e) => setData((s) => ({ ...s, brandDesc: e.target.value }))}
              onBlur={() => doSave({ ...data })}
            />
          </label>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {swatch('Background', 'bg')}
            {swatch('Primary', 'primary')}
            {swatch('Secondary', 'secondary')}
            {swatch('Accent', 'accent')}
          </div>

          <label className="flex flex-col gap-2">
            <span>Font family</span>
            <input
              placeholder={`e.g., "Inter", "Poppins"`}
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
              value={data.font ?? ''}
              onChange={(e) => setData((s) => ({ ...s, font: e.target.value }))}
              onBlur={() => doSave({ ...data })}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span>Voice & Tone</span>
            <textarea
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
              value={data.tone ?? ''}
              onChange={(e) => setData((s) => ({ ...s, tone: e.target.value }))}
              onBlur={() => doSave({ ...data })}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span>Logo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onLogo(e.currentTarget.files?.[0] ?? null)}
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            />
            {data.logoUrl && (
              <div className="text-sm opacity-80">Saved: {data.logoUrl}</div>
            )}
          </label>

          <div className="mt-4 flex gap-3">
            <button
              onClick={onBack}
              className="rounded-md bg-white/10 px-4 py-2 border border-white/20"
            >
              ← Back
            </button>
            <button
              onClick={() => doSave(data)}
              className="rounded-md bg-white/10 px-4 py-2 border border-white/20"
            >
              Save
            </button>
            <button
              onClick={onNext}
              className="rounded-md bg-sky-600 px-4 py-2 text-white"
            >
              Continue →
            </button>
          </div>
        </div>

        {/* Right: preview */}
        <div
          className="rounded-2xl p-6 border border-white/10"
          style={{ background: data.bg }}
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-md"
                 style={{ background: data.primary }} />
            <div className="text-white/80">Your Logo</div>
          </div>

          <h2 className="mt-6 text-2xl font-semibold" style={{ color: data.primary }}>
            Signature Profile Report
          </h2>

          <p className="mt-3 leading-relaxed" style={{ color: data.secondary }}>
            {previewCopy}
          </p>

          <div className="mt-6 flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: data.accent }} />
              Accent
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: data.primary }} />
              Primary
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: data.secondary }} />
              Secondary
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: data.bg }} />
              Background
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
