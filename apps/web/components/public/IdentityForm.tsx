// apps/web/components/public/IdentityForm.tsx
"use client";

import { useState } from "react";

type Props = {
  token: string;
  onStarted: (payload: { taker_id: string; test_id: string }) => void;
};

export default function IdentityForm({ token, onStarted }: Props) {
  const [first_name, setFirst] = useState("");
  const [last_name,  setLast]  = useState("");
  const [email,      setEmail] = useState("");
  const [company,    setCompany] = useState("");
  const [role_title, setRole]    = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/public/test/${token}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name, last_name, email, company, role_title }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      onStarted({ taker_id: json.taker_id, test_id: json.test_id });
    } catch (e: any) {
      setErr(e?.message || "Failed to start test");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border rounded-md p-2" placeholder="First name" value={first_name} onChange={(e)=>setFirst(e.target.value)} required />
        <input className="border rounded-md p-2" placeholder="Last name"  value={last_name}  onChange={(e)=>setLast(e.target.value)}  required />
      </div>
      <input className="border rounded-md p-2 w-full" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border rounded-md p-2" placeholder="Company (optional)" value={company} onChange={(e)=>setCompany(e.target.value)} />
        <input className="border rounded-md p-2" placeholder="Role / Department (optional)" value={role_title} onChange={(e)=>setRole(e.target.value)} />
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button disabled={busy} className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50">
        {busy ? "Starting…" : "Start Test"}
      </button>
    </form>
  );
}
