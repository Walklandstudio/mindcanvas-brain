// apps/web/app/onboarding/create-account/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

/**
 * We persist “create account” details into the same `company` blob
 * used by the rest of onboarding so everything lives in one place.
 */
type Account = {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
};

const defaults: Account = {
  companyName: '',
  firstName: '',
  lastName: '',
  position: '',
  email: '',
  phone: '',
  website: '',
  linkedin: '',
};

export default function Page() {
  const [data, setData] = useState<Account>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Autosave to the `company` section so later steps see the same data
  useOnboardingAutosave('company', data);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/onboarding', { cache: 'no-store' });
        const j = await r.json();
        // Merge any existing `company` fields (may already contain some of these keys)
        setData({ ...defaults, ...(j?.onboarding?.company ?? {}) });
      } catch {
        // keep defaults if fetch fails
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
      <h1 className="text-2xl font-semibold">Step 1 — Create Account</h1>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm mb-1">Company Name *</label>
          <input
            required
            className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.companyName ?? ''}
            onChange={(e) => setData((d) => ({ ...d, companyName: e.target.value }))}
            placeholder="Your company"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">First Name</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.firstName ?? ''}
              onChange={(e) => setData((d) => ({ ...d, firstName: e.target.value }))}
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Last Name</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.lastName ?? ''}
              onChange={(e) => setData((d) => ({ ...d, lastName: e.target.value }))}
              placeholder="Doe"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Position</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.position ?? ''}
              onChange={(e) => setData((d) => ({ ...d, position: e.target.value }))}
              placeholder="Head of People, Founder…"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email *</label>
            <input
              required
              type="email"
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.email ?? ''}
              onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.phone ?? ''}
              onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
              placeholder="+1 555 555 5555"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Website</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.website ?? ''}
              onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">LinkedIn</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.linkedin ?? ''}
              onChange={(e) => setData((d) => ({ ...d, linkedin: e.target.value }))}
              placeholder="https://linkedin.com/company/your-company"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a className="px-4 py-2 rounded-xl border" href="/">
            Back
          </a>
          <button
            onClick={saveOnce}
            disabled={saving || !data.companyName || !data.email}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & Next'}
          </button>
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/company">
            Next
          </a>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </main>
  );
}
