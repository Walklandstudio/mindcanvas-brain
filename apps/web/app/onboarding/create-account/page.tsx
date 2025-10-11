'use client';

import { useCallback, useEffect, useState } from 'react';
import useOnboardingAutosave from '../_lib/useOnboardingAutosave';

type Company = {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
};

async function loadCompany(): Promise<Company> {
  const res = await fetch('/api/onboarding/get?step=create-account', { cache: 'no-store' });
  if (!res.ok) return {};
  const json = await res.json().catch(() => ({}));
  return (json?.data as Company) ?? {};
}

async function saveCompany(payload: Company) {
  await fetch('/api/onboarding/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'create-account', data: payload }),
  });
}

export default function CreateAccountPage() {
  const [data, setData] = useState<Company>({
    companyName: '',
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
  });

  // initial load
  useEffect(() => {
    (async () => {
      try {
        const initial = await loadCompany();
        if (initial && Object.keys(initial).length) {
          setData((d) => ({ ...d, ...initial }));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // autosave (default export!)
  const onSave = useCallback((d: Company) => saveCompany(d), []);
  useOnboardingAutosave(data, onSave, 500);

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Step 1 — Create Account</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-sm opacity-80">Company Name *</label>
          <input
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.companyName ?? ''}
            onChange={(e) => setData((d) => ({ ...d, companyName: e.target.value }))}
            placeholder="Your company"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">First Name</label>
          <input
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.firstName ?? ''}
            onChange={(e) => setData((d) => ({ ...d, firstName: e.target.value }))}
            placeholder="Jane"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">Last Name</label>
          <input
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.lastName ?? ''}
            onChange={(e) => setData((d) => ({ ...d, lastName: e.target.value }))}
            placeholder="Doe"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">Position</label>
          <input
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.position ?? ''}
            onChange={(e) => setData((d) => ({ ...d, position: e.target.value }))}
            placeholder="Head of People"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">Email *</label>
          <input
            type="email"
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.email ?? ''}
            onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
            placeholder="you@company.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">Phone</label>
          <input
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.phone ?? ''}
            onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
            placeholder="+1 555 0100"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">Website</label>
          <input
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.website ?? ''}
            onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))}
            placeholder="https://example.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">LinkedIn</label>
          <input
            className="rounded-md border border-white/10 bg-white px-3 py-2 text-black"
            value={data.linkedin ?? ''}
            onChange={(e) => setData((d) => ({ ...d, linkedin: e.target.value }))}
            placeholder="https://linkedin.com/company/your-company"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <a href="/" className="rounded-md bg-white/10 px-4 py-2">
          Back
        </a>
        <a href="/onboarding/company" className="rounded-md bg-white px-4 py-2 text-black">
          Save & Next
        </a>
      </div>
    </main>
  );
}
