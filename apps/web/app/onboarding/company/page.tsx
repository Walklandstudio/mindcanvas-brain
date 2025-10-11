// apps/web/app/onboarding/company/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

type Company = {
  website?: string;
  linkedin?: string;
  industry?: string;
  sector?: string;
  audience?: string;
};

const defaults: Company = {
  website: '',
  linkedin: '',
  industry: '',
  sector: '',
  audience: '',
};

export default function Page() {
  const [data, setData] = useState<Company>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Autosave
  useOnboardingAutosave('company', data);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/onboarding', { cache: 'no-store' });
        const j = await r.json();
        setData({ ...defaults, ...(j?.onboarding?.company ?? {}) });
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
        body: JSON.stringify({ company: data }),
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

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <div className="text-sm opacity-70">Loading…</div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Step 2 — Company</h1>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Website</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.website ?? ''}
              onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">LinkedIn</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.linkedin ?? ''}
              onChange={(e) => setData((d) => ({ ...d, linkedin: e.target.value }))}
              placeholder="https://linkedin.com/company/your-company"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Industry</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.industry ?? ''}
              onChange={(e) => setData((d) => ({ ...d, industry: e.target.value }))}
              placeholder="e.g., SaaS, Education"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Sector</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.sector ?? ''}
              onChange={(e) => setData((d) => ({ ...d, sector: e.target.value }))}
              placeholder="e.g., B2B, B2C"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Audience</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.audience ?? ''}
              onChange={(e) => setData((d) => ({ ...d, audience: e.target.value }))}
              placeholder="e.g., HR Managers, Sales Teams"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/create-account">
            Back
          </a>
          <button
            onClick={saveOnce}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & Next'}
          </button>
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/branding">
            Next
          </a>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </main>
  );
}
