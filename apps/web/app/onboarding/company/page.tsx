'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useOnboardingAutosave from '../_lib/useOnboardingAutosave';

type Company = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
};

async function load(): Promise<Company> {
  const res = await fetch('/api/onboarding/get?step=company', { cache: 'no-store' });
  if (!res.ok) return {};
  const json = await res.json().catch(() => ({}));
  return (json?.data as Company) ?? {};
}

async function saveCompany(payload: Company) {
  await fetch('/api/onboarding/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'company', data: payload }),
  });
}

export default function CompanyPage() {
  const [data, setData] = useState<Company>({});

  // Load once on mount
  useEffect(() => {
    (async () => {
      try {
        const initial = await load();
        setData((d) => ({ ...d, ...initial }));
      } catch {
        // ignore
      }
    })();
  }, []);

  const onSave = useCallback((d: Company) => saveCompany(d), []);
  // Accepts optional 3rd arg (delay). Leave as 400 or tweak.
  useOnboardingAutosave(data, onSave, 400);

  const disabled = useMemo(
    () => !(data?.name && data?.email && data?.firstName && data?.lastName),
    [data?.email, data?.firstName, data?.lastName, data?.name]
  );

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Step 1 — Create Account</h1>

      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm opacity-80">Company Name *</span>
          <input
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.name ?? ''}
            onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
            placeholder="Your Company Inc."
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">First Name *</span>
          <input
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.firstName ?? ''}
            onChange={(e) => setData((d) => ({ ...d, firstName: e.target.value }))}
            placeholder="Ada"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Last Name *</span>
          <input
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.lastName ?? ''}
            onChange={(e) => setData((d) => ({ ...d, lastName: e.target.value }))}
            placeholder="Lovelace"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Position</span>
          <input
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.position ?? ''}
            onChange={(e) => setData((d) => ({ ...d, position: e.target.value }))}
            placeholder="Head of People"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Email *</span>
          <input
            type="email"
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.email ?? ''}
            onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
            placeholder="you@company.com"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Phone</span>
          <input
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.phone ?? ''}
            onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
            placeholder="+1 555 123 4567"
          />
        </label>

        {/* NOTE: Website / LinkedIn often belong in the Company step.
                 If you want them moved, we can adjust routes later. */}
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Website</span>
          <input
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.website ?? ''}
            onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))}
            placeholder="https://example.com"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm opacity-80">LinkedIn</span>
          <input
            className="rounded-md border border-white/10 bg-white text-black px-3 py-2"
            value={data.linkedin ?? ''}
            onChange={(e) => setData((d) => ({ ...d, linkedin: e.target.value }))}
            placeholder="https://www.linkedin.com/company/your-company"
          />
        </label>

        <div className="mt-4 flex gap-3 md:col-span-2">
          <a
            href="/onboarding/branding"
            className={`rounded-md px-4 py-2 text-black ${
              disabled ? 'pointer-events-none bg-white/40' : 'bg-white'
            }`}
          >
            Save & Next
          </a>
        </div>
      </form>
    </main>
  );
}
