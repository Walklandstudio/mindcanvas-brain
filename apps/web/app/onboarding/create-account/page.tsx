'use client';
import { useState, useCallback } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

type Company = {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
};

async function load() {
  const r = await fetch('/api/onboarding', { cache: 'no-store' });
  const j = await r.json();
  return (j.onboarding?.company ?? {}) as Company;
}

async function saveCompany(payload: Company) {
  await fetch('/api/onboarding', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ company: payload })
  });
}

export default function Page() {
  const [data, setData] = useState<Company>({});

  useState(() => { (async () => setData(await load()))(); });

  const onSave = useCallback((d: Company) => saveCompany(d), []);
  useOnboardingAutosave(data, onSave, 400);

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-6">Step 1 — Create Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Company Name *</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.companyName ?? ''} onChange={e=>setData({...data, companyName:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">First Name</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.firstName ?? ''} onChange={e=>setData({...data, firstName:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Last Name</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.lastName ?? ''} onChange={e=>setData({...data, lastName:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Position</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.position ?? ''} onChange={e=>setData({...data, position:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Email *</label>
          <input type="email" className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.email ?? ''} onChange={e=>setData({...data, email:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.phone ?? ''} onChange={e=>setData({...data, phone:e.target.value})}/>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <a className="px-4 py-2 rounded-xl border" href="/dashboard">Back</a>
        <a className="px-4 py-2 rounded-xl bg-white text-black" href="/onboarding/company">Save & Next</a>
      </div>
    </main>
  );
}
