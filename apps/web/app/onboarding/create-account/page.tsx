'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useOnboardingAutosave from '../_lib/useOnboardingAutosave';

type Account = {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  phone?: string;
};

async function load(): Promise<Account> {
  const res = await fetch('/api/onboarding/get?step=create_account', { credentials: 'include' });
  if (!res.ok) return {};
  const json = await res.json();
  return (json?.data as Account) ?? {};
}

async function save(data: Account) {
  await fetch('/api/onboarding/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ step: 'create_account', data }),
  });
}

export default function CreateAccountPage() {
  const router = useRouter();
  const [data, setData] = useState<Account>({});

  useEffect(() => { (async () => setData(await load()))(); }, []);
  const saveCb = useCallback((d: Account) => save(d), []);
  useOnboardingAutosave<Account>(data, saveCb, 600);

  const onNext = async () => {
    await save(data);
    router.push('/onboarding/company');
  };

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-6">Step 1 — Create Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span>Company Name *</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.companyName ?? ''}
            onChange={(e) => setData((s) => ({ ...s, companyName: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>First Name</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.firstName ?? ''}
            onChange={(e) => setData((s) => ({ ...s, firstName: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>Last Name</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.lastName ?? ''}
            onChange={(e) => setData((s) => ({ ...s, lastName: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>Email *</span>
          <input
            type="email"
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.email ?? ''}
            onChange={(e) => setData((s) => ({ ...s, email: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>Position</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.position ?? ''}
            onChange={(e) => setData((s) => ({ ...s, position: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>Phone</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.phone ?? ''}
            onChange={(e) => setData((s) => ({ ...s, phone: e.target.value }))}
          />
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => save(data)}
          className="rounded-md bg-white/10 px-4 py-2 border border-white/20"
        >
          Save
        </button>
        <button
          onClick={onNext}
          className="rounded-md bg-sky-600 px-4 py-2 text-white"
        >
          Save & Next
        </button>
      </div>
    </main>
  );
}
