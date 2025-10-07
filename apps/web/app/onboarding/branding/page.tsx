'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Colors = { primary?: string; secondary?: string; tertiary?: string; background?: string };
type Branding = { logo_url?: string | null; font?: string | null; colors: Colors };

export default function Branding() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [branding, setBranding] = useState<Branding>({
    logo_url: '',
    font: 'Inter, ui-sans-serif, system-ui',
    colors: {
      primary: '#111111',
      secondary: '#6B7280',
      tertiary: '#E5E7EB',
      background: '#FAFAFA'
    }
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.replace('/login');
        return;
      }

      const token = data.session.access_token;
      const res = await fetch('/api/onboarding/branding', { headers: { Authorization: `Bearer ${token}` }});
      const j = await res.json();
      if (j?.ok && j.data) {
        setBranding({
          logo_url: j.data.logo_url ?? '',
          font: j.data.font ?? branding.font,
          colors: { ...branding.colors, ...(j.data.colors || {}) }
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: return type is Promise<string> and we never return void
  async function uploadLogo(file: File): Promise<string> {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      router.replace('/login');
      throw new Error('Not authenticated'); // don't return void
    }
    const token = data.session.access_token;

    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/logo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'upload failed');
    return j.url as string;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.replace('/login');
        throw new Error('Not authenticated');
      }
      const token = data.session.access_token;

      const res = await fetch('/api/onboarding/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(branding)
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'save failed');
      setMsg('✅ Saved');
    } catch (err: any) {
      setMsg('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Branding</h1>
      <p className="text-sm text-gray-600">Step 2 — Upload your logo and choose colors. Preview updates live.</p>

      <form onSubmit={onSave} className="space-y-6">
        {/* Logo uploader */}
        <section className="rounded-lg border p-4 bg-white space-y-3">
          <h2 className="font-medium">Logo</h2>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logo_url} alt="logo" className="max-h-14 max-w-14 object-contain" />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
            <input
              type="file" accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const url = await uploadLogo(f);
                  setBranding({ ...branding, logo_url: url });
                  setMsg('✅ Logo uploaded');
                } catch (err: any) {
                  setMsg('❌ ' + err.message);
                }
              }}
            />
          </div>
        </section>

        {/* Colors & font */}
        <section className="rounded-lg border p-4 bg-white space-y-3">
          <h2 className="font-medium">Colors & Font</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['primary','secondary','tertiary','background'] as const).map((key) => (
              <label key={key} className="text-sm">
                <div className="font-medium capitalize">{key}</div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.colors[key] || '#000000'}
                    onChange={(e) => setBranding({ ...branding, colors: { ...branding.colors, [key]: e.target.value } })}
                  />
                  <input
                    className="flex-1 rounded-md border px-2 py-1"
                    value={branding.colors[key] || ''}
                    onChange={(e) => setBranding({ ...branding, colors: { ...branding.colors, [key]: e.target.value } })}
                    placeholder="#000000"
                  />
                </div>
              </label>
            ))}
          </div>

          <label className="block text-sm">
            <div className="font-medium">Font</div>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={branding.font || ''}
              onChange={(e) => setBranding({ ...branding, font: e.target.value })}
              placeholder="e.g., Inter, ui-sans-serif, system-ui"
            />
          </label>
        </section>

        {/* Preview */}
        <section className="rounded-lg border p-4 bg-white space-y-3">
          <h2 className="font-medium">Preview</h2>
          <div
            className="rounded-lg border p-6"
            style={{
              background: branding.colors.background,
              fontFamily: branding.font || undefined
            }}
          >
            <div className="flex items-center gap-3">
              {branding.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logo_url} alt="logo" className="h-10 w-10 object-contain" />
              )}
              <div className="text-xl font-semibold" style={{ color: branding.colors.primary }}>
                Signature Profiling System
              </div>
            </div>
            <p className="mt-2 text-sm" style={{ color: branding.colors.secondary }}>
              Example report header / section title
            </p>
            <div className="mt-4 h-2 rounded" style={{ background: branding.colors.tertiary }} />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {msg && <span className="text-sm">{msg}</span>}
          <a href="/dashboard" className="text-sm underline ml-auto">Back to Dashboard</a>
        </div>
      </form>
    </main>
  );
}
