'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Profile = {
  company_name: string;
  first_name: string;
  last_name: string;
  position?: string;
  contact_email: string;
  phone_country?: string;
  phone_number?: string;
};

export default function Onboarding() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [form, setForm] = useState<Profile>({
    company_name: '',
    first_name: '',
    last_name: '',
    position: '',
    contact_email: '',
    phone_country: '',
    phone_number: ''
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');

      const token = data.session.access_token;
      const res = await fetch('/api/onboarding/step1', { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j?.ok && j.data) setForm((f) => ({ ...f, ...j.data }));
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const { data } = await supabase.auth.getSession();
    if (!data.session) return router.replace('/login');

    const token = data.session.access_token;
    const res = await fetch('/api/onboarding/step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    const j = await res.json();
    setSaving(false);
    if (!j.ok) return setMsg(j.error || 'Save failed');

    setMsg('✅ Saved');
  }

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Create an Account</h1>
      <p className="text-sm text-gray-600">Step 1 of onboarding — Company & Contact</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Company Name *</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">First Name *</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name *</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Position</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.position ?? ''}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Contact Email *</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Country Code</label>
            <input
              placeholder="+1"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.phone_country ?? ''}
              onChange={(e) => setForm({ ...form, phone_country: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium">Phone Number</label>
            <input
              placeholder="5551234567"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.phone_number ?? ''}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {msg && <span className="text-sm">{msg}</span>}

          {/* Continue to branding */}
          <a href="/onboarding/branding" className="ml-auto text-sm underline">
            Continue to Branding →
          </a>
        </div>
      </form>
    </main>
  );
}
