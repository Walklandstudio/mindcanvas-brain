'use client';

import { useEffect } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

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

export default function Page() {
  const { data, update, saving, saveNow, loadFromServer, clearDraft } =
    useOnboardingAutosave<Company>('company', {});

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/onboarding', { cache: 'no-store' });
      const j = await r.json();
      loadFromServer(j.onboarding?.company ?? {});
    })();
  }, [loadFromServer]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Step 1 — Create Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Company Name *</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={data.companyName ?? ''}
                 onChange={e => update('companyName', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1">First Name</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={data.firstName ?? ''}
                 onChange={e => update('firstName', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Last Name</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={data.lastName ?? ''}
                 onChange={e => update('lastName', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1">Position</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={data.position ?? ''}
                 onChange={e => update('position', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email *</label>
          <input type="email" className="w-full rounded-md border px-3 py-2"
                 value={data.email ?? ''}
                 onChange={e => update('email', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={data.phone ?? ''}
                 onChange={e => update('phone', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Website</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={data.website ?? ''}
                 onChange={e => update('website', e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">LinkedIn</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={data.linkedin ?? ''}
                 onChange={e => update('linkedin', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <a className="px-4 py-2 rounded-xl border" href="/">Back</a>
        <button onClick={() => saveNow()} disabled={saving}
                className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={async () => {
            await saveNow(); clearDraft(); window.location.assign('/onboarding/branding');
          }}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}
