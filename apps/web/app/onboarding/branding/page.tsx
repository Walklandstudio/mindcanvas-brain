'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type Branding = {
  primary?: string;
  secondary?: string;
  accent?: string;
  font?: string;
  logoUrl?: string;
  tone?: string;
};

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

  async function onUploadLogo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'upload_failed');
      setData((d) => ({ ...d, logoUrl: j.url }));
    } catch (e: any) {
      alert(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const vars = useMemo(
    () =>
      ({
        ['--brand-primary' as any]: data.primary || '#2d8fc4',
        ['--brand-secondary' as any]: data.secondary || '#015a8b',
        ['--brand-accent' as any]: data.accent || '#64bae2',
        ['--brand-font' as any]:
          data.font ||
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial',
      }) as React.CSSProperties,
    [data.primary, data.secondary, data.accent, data.font]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* Controls */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Color label="Primary"   value={data.primary ?? '#2d8fc4'} onChange={(v)=>setData({...data, primary:v})} />
          <Color label="Secondary" value={data.secondary ?? '#015a8b'} onChange={(v)=>setData({...data, secondary:v})} />
          <Color label="Accent"    value={data.accent ?? '#64bae2'} onChange={(v)=>setData({...data, accent:v})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Font family</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder='e.g. "Inter", "Poppins"'
              value={data.font ?? ''}
              onChange={(e) => setData({ ...data, font: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Logo</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onUploadLogo(e.target.files[0])}
              />
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
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/company">Back</a>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
            {saving ? 'Saving…' : 'Save & Next'}
          </button>
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/goals">Next</a>
        </div>
      </div>

      {/* Live Report Preview */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5" style={vars}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md" style={{ background: 'var(--brand-primary)' }} />
            <div className="text-sm text-slate-300">Report Preview</div>
          </div>
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="px-2 py-1 rounded bg-white/10 text-xs text-slate-300">Your Logo</div>
          )}
        </div>

        <h3 className="mt-4 text-xl font-bold" style={{ color: 'var(--brand-accent)', fontFamily: 'var(--brand-font)' }}>
          Signature Profile Report
        </h3>
        <p className="text-sm mt-2" style={{ color: 'var(--brand-secondary)' }}>
          {data.tone?.trim()
            ? data.tone
            : 'Clear, confident, and practical guidance that reflects your brand voice.'}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Dot color="var(--brand-accent)" label="Accent" />
          <Dot color="var(--brand-primary)" label="Primary" />
          <Dot color="var(--brand-secondary)" label="Secondary" />
        </div>
      </div>
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm">{label}</label>
      <input type="color" className="w-full h-10" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Dot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
