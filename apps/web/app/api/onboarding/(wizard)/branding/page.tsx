'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

type Branding = {
  primary?: string;
  secondary?: string;
  accent?: string;
  font?: string;
  logoUrl?: string;
  tone?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [data, setData] = useState<Branding>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/onboarding');
      const j = await r.json();
      setData(j.onboarding?.branding ?? {});
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: data }),
      });
      alert('Saved');
    } finally {
      setSaving(false);
    }
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // unique-ish path; we don’t need orgId on the client
      const path = `public/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('branding').getPublicUrl(path);
      const url = pub.publicUrl;
      setData((d) => ({ ...d, logoUrl: url }));
    } catch (err: any) {
      alert('Logo upload failed: ' + (err?.message || 'unknown error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm">Primary</label>
            <input
              type="color"
              className="w-full h-10"
              value={data.primary ?? '#2d8fc4'}
              onChange={(e) => setData({ ...data, primary: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Secondary</label>
            <input
              type="color"
              className="w-full h-10"
              value={data.secondary ?? '#015a8b'}
              onChange={(e) => setData({ ...data, secondary: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Accent</label>
            <input
              type="color"
              className="w-full h-10"
              value={data.accent ?? '#64bae2'}
              onChange={(e) => setData({ ...data, accent: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Font family</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="e.g. Inter, Helvetica, Arial"
              value={data.font ?? ''}
              onChange={(e) => setData({ ...data, font: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Logo</label>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} />
              {uploading && <span className="text-xs text-slate-400">Uploading…</span>}
            </div>
            {data.logoUrl && (
              <div className="mt-2">
                <img src={data.logoUrl} alt="Logo" className="h-10 object-contain" />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm">Voice & Tone</label>
          <textarea
            rows={4}
            className="w-full rounded-md border px-3 py-2"
            value={data.tone ?? ''}
            onChange={(e) => setData({ ...data, tone: e.target.value })}
          />
        </div>

        <div className="flex gap-3">
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/(wizard)/company">
            Back
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & Next'}
          </button>
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/(wizard)/goals">
            Next
          </a>
        </div>
      </div>

      {/* Live preview card */}
      <div
        className="rounded-2xl border border-white/10 bg-white/5 p-5"
        style={
          {
            ['--p' as any]: data.primary || '#2d8fc4',
            ['--s' as any]: data.secondary || '#015a8b',
            ['--a' as any]: data.accent || '#64bae2',
            fontFamily: data.font || undefined,
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-3">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="Logo" className="h-8 object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-md" style={{ background: 'var(--p)' }} />
          )}
          <div className="text-sm text-slate-300">Report Preview</div>
        </div>
        <h3 className="mt-4 text-xl font-bold" style={{ color: 'var(--p)' }}>
          Signature Profile Report
        </h3>
        <p className="text-sm mt-2" style={{ color: 'var(--s)' }}>
          {data.tone?.trim()
            ? data.tone
            : 'Clear, confident, and practical guidance that reflects your brand voice.'}
        </p>
        <div className="mt-4 h-2 rounded-full" style={{ background: 'var(--a)' }} />
      </div>
    </div>
  );
}
