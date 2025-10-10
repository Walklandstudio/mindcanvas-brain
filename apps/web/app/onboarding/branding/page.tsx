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

  // load existing
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
      setData(d => ({ ...d, logoUrl: j.url }));
    } catch (e: any) {
      alert(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const themeVars = useMemo(() => ({
    '--brand-primary': data.primary || '#2d8fc4',
    '--brand-secondary': data.secondary || '#015a8b',
    '--brand-accent': data.accent || '#64bae2',
    '--brand-font': data.font || 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  } as React.CSSProperties), [data.primary, data.secondary, data.accent, data.font]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <h1 className="text-xl font-semibold">Branding</h1>
        <p className="mt-1 text-sm text-slate-300">Set your brand colors, font, logo, and voice. The preview updates live.</p>

        {/* Controls */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          {/* Left: inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-300">Primary</label>
                <input
                  type="color"
                  className="h-10 w-full rounded-md border border-white/10 bg-white/5"
                  value={data.primary ?? '#2d8fc4'}
                  onChange={e => setData({ ...data, primary: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Secondary</label>
                <input
                  type="color"
                  className="h-10 w-full rounded-md border border-white/10 bg-white/5"
                  value={data.secondary ?? '#015a8b'}
                  onChange={e => setData({ ...data, secondary: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Accent</label>
                <input
                  type="color"
                  className="h-10 w-full rounded-md border border-white/10 bg-white/5"
                  value={data.accent ?? '#64bae2'}
                  onChange={e => setData({ ...data, accent: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300">Font</label>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
                  value={data.font ?? ''}
                  onChange={e => setData({ ...data, font: e.target.value })}
                  placeholder='e.g. "Inter", "Poppins", ...'
                />
                <p className="mt-1 text-xs text-slate-400">If empty, system font will be used.</p>
              </div>

              <div>
                <label className="block text-sm text-slate-300">Logo</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && onUploadLogo(e.target.files[0])}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 file:mr-3 file:rounded-md file:border-none file:bg-white/10 file:px-3 file:py-2 file:text-sm"
                  />
                  {uploading && <span className="text-xs text-slate-400">Uploading…</span>}
                </div>
                {data.logoUrl && (
                  <div className="mt-2 text-xs text-slate-400 break-all">
                    Uploaded: <a className="underline" href={data.logoUrl} target="_blank">{data.logoUrl}</a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300">Voice & Tone</label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
                value={data.tone ?? ''}
                onChange={e => setData({ ...data, tone: e.target.value })}
                placeholder="e.g. concise, confident, people-first…"
              />
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/onboarding/company"
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
              >
                Back
              </a>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <a
                href="/onboarding/goals"
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
              >
                Next
              </a>
            </div>
          </div>

          {/* Right: live preview */}
          <div>
            <ReportPreview
              logoUrl={data.logoUrl}
              tone={data.tone}
              styleVars={themeVars}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportPreview({
  logoUrl,
  tone,
  styleVars,
}: {
  logoUrl?: string;
  tone?: string;
  styleVars: React.CSSProperties;
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 p-5"
      style={styleVars}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--brand-accent), var(--brand-primary))' }}
          />
          <div className="text-sm text-slate-300">Report Preview</div>
        </div>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
        ) : (
          <div className="px-2 py-1 rounded bg-white/10 text-xs text-slate-300">Your Logo</div>
        )}
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, var(--brand-secondary), rgba(255,255,255,0) 60%)',
          fontFamily: 'var(--brand-font)',
        }}
      >
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--brand-accent)' }}
        >
          Signature Profile — “Visionary”
        </h3>
        <p className="text-slate-200/90 mt-1 text-sm">
          Strengths: idea generation, fast synthesis, energizes teams.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-[#0a1222] p-3">
            <div className="text-xs text-slate-400">Ideal Roles</div>
            <ul className="mt-1 text-sm list-disc pl-5 text-slate-200/90">
              <li>Product Strategy</li>
              <li>Creative Direction</li>
              <li>Innovation Lead</li>
            </ul>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0a1222] p-3">
            <div className="text-xs text-slate-400">Guidance</div>
            <p className="mt-1 text-sm text-slate-200/90">
              Pair with detail-oriented partners. Convert ideas into 90-day milestones.
            </p>
          </div>
        </div>

        {tone && (
          <div className="mt-4 rounded-lg border border-white/10 bg-[#0a1222] p-3">
            <div className="text-xs text-slate-400">Voice & Tone</div>
            <p className="mt-1 text-sm text-slate-200/90">{tone}</p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-400">Accent</span>
          <span className="h-3 w-3 rounded-full" style={{ background: 'var(--brand-accent)' }} />
          <span className="text-xs text-slate-400">Primary</span>
          <span className="h-3 w-3 rounded-full" style={{ background: 'var(--brand-primary)' }} />
          <span className="text-xs text-slate-400">Secondary</span>
          <span className="h-3 w-3 rounded-full" style={{ background: 'var(--brand-secondary)' }} />
        </div>
      </div>
    </div>
  );
}
