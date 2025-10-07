'use client';

import { useEffect, useState } from 'react';

type Meta = { name: string; test_id: string; token: string } | null;

export default function PublicTest({ params }: { params: { token: string } }) {
  const [meta, setMeta] = useState<Meta>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    company: '', team: '', team_function: ''
  });
  const token = params.token;

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/public/test/${token}`);
      const j = await res.json();
      if (j?.ok) setMeta(j.data);
      setLoading(false);
    })();
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const res = await fetch(`/api/public/test/${token}`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(form)
    });
    const j = await res.json();
    if (j?.ok) {
      setMsg('✅ Thanks! Your details are saved.');
      // TODO: redirect to actual test / profile report when ready
    } else {
      setMsg('❌ ' + (j?.error || 'submit failed'));
    }
  }

  if (loading) return <main className="p-8">Loading…</main>;
  if (!meta) return <main className="p-8">Invalid or expired link.</main>;

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">{meta.name}</h1>
      <p className="text-gray-600 text-sm">Please enter your details to begin.</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="rounded-md border px-3 py-2" placeholder="First name" value={form.first_name} onChange={e=>setForm({...form, first_name:e.target.value})} required />
          <input className="rounded-md border px-3 py-2" placeholder="Last name" value={form.last_name} onChange={e=>setForm({...form, last_name:e.target.value})} required />
        </div>
        <input type="email" className="w-full rounded-md border px-3 py-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
        <input className="w-full rounded-md border px-3 py-2" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
        <input className="w-full rounded-md border px-3 py-2" placeholder="Company / Group" value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="rounded-md border px-3 py-2" placeholder="Team Name" value={form.team} onChange={e=>setForm({...form, team:e.target.value})} />
          <input className="rounded-md border px-3 py-2" placeholder="Team Function" value={form.team_function} onChange={e=>setForm({...form, team_function:e.target.value})} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className="rounded-md bg-black px-4 py-2 text-white">Submit</button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </form>
    </main>
  );
}
