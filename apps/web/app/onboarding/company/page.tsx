'use client';
import { useState, useCallback } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

type Company = {
  website?: string; linkedin?: string;
  industry?: string; sector?: string; audience?: string;
};

async function load() {
  const r = await fetch('/api/onboarding', { cache:'no-store' }); const j = await r.json();
  return (j.onboarding?.company ?? {}) as Company;
}
async function saveCompany(payload: Company) {
  await fetch('/api/onboarding', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ company: payload }) });
}

export default function Page() {
  const [data, setData] = useState<Company>({});
  useState(()=>{ void (async()=> setData(await load()))(); });
  useOnboardingAutosave(data, useCallback((d)=>saveCompany(d), []), 400);

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-6">Step 2 — Company</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Website</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.website ?? ''} onChange={e=>setData({...data, website:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">LinkedIn</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.linkedin ?? ''} onChange={e=>setData({...data, linkedin:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Industry</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.industry ?? ''} onChange={e=>setData({...data, industry:e.target.value})}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Sector</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.sector ?? ''} onChange={e=>setData({...data, sector:e.target.value})}/>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Audience</label>
          <input className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={data.audience ?? ''} onChange={e=>setData({...data, audience:e.target.value})}/>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <a className="px-4 py-2 rounded-xl border" href="/onboarding/create-account">Back</a>
        <a className="px-4 py-2 rounded-xl bg-white text-black" href="/onboarding/branding">Save & Next</a>
      </div>
    </main>
  );
}
