
// apps/web/app/onboarding/(wizard)/create-account/page.tsx
'use client';
import { useEffect, useState } from 'react';

type Account = {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
};

export default function Page() {
  const [data, setData] = useState<Account>({});
  const [saving, setSaving] = useState(false);

  // Load existing onboarding and hydrate this step if present
  useEffect(() => { (async () => {
    const r = await fetch('/api/onboarding');
    const j = await r.json();
    const c = j.onboarding?.company ?? {};
    setData({
      companyName: c.companyName ?? '',
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      position: c.position ?? '',
      email: c.email ?? '',
      phone: c.phone ?? ''
    });
  })(); }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: { ...data } })
      });
      alert('Saved');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm">Company Name *</label>
          <input required className="w-full border rounded-md px-3 py-2" value={data.companyName ?? ''} onChange={e=>setData({...data, companyName:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">First Name</label>
          <input className="w-full border rounded-md px-3 py-2" value={data.firstName ?? ''} onChange={e=>setData({...data, firstName:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Last Name</label>
          <input className="w-full border rounded-md px-3 py-2" value={data.lastName ?? ''} onChange={e=>setData({...data, lastName:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Position</label>
          <input className="w-full border rounded-md px-3 py-2" value={data.position ?? ''} onChange={e=>setData({...data, position:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Email *</label>
          <input type="email" required className="w-full border rounded-md px-3 py-2" value={data.email ?? ''} onChange={e=>setData({...data, email:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Phone</label>
          <input className="w-full border rounded-md px-3 py-2" value={data.phone ?? ''} onChange={e=>setData({...data, phone:e.target.value})} />
        </div>
      </div>

      <div className="flex gap-3">
        <a className="px-4 py-2 rounded-xl border" href="/">Back</a>
        <button onClick={save} disabled={saving || !data.companyName || !data.email} className="px-4 py-2 rounded-xl bg-black text-white">{saving?'Saving…':'Save & Next'}</button>
        <a className="px-4 py-2 rounded-xl border" href="/onboarding/(wizard)/company">Next</a>
      </div>
    </div>
  );
}
