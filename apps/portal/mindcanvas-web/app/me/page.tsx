// app/me/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  taken_at: string | null;
  full_profile_code: string | null;
  full_frequency: string | null;
  test?: { slug?: string | null; name?: string | null } | null;
};

export default function MePage() {
  const [email, setEmail] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill from ?email=
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const e = sp.get("email") || "";
    setEmail(e);
    if (e) fetchRows(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRows(e: string) {
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const res = await fetch(`/api/submissions/by-email?email=${encodeURIComponent(e)}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = email.trim();
    if (!e) return;
    const url = new URL(location.href);
    url.searchParams.set("email", e);
    history.replaceState(null, "", url.toString());
    fetchRows(e);
  }

  const items = useMemo(() => rows.map(r => ({
    id: r.id,
    when: new Date(r.taken_at ?? Date.now()).toLocaleString(),
    test: r.test?.name ?? r.test?.slug ?? "Test",
    profile: r.full_profile_code ?? "—",
    freq: r.full_frequency ?? "—",
  })), [rows]);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">My Tests</h1>

      <form onSubmit={onSubmit} className="flex gap-2 items-end">
        <label className="flex-1 text-sm">
          <span className="text-gray-700">Email</span>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <button className="border rounded px-4 py-2">Look up</button>
      </form>

      {loading && <p className="text-sm text-gray-600">Loading…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && !err && !items.length && email && (
        <p className="text-sm">No submissions found for {email}.</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.id} className="border rounded p-3 flex items-center gap-3">
              <div className="text-sm">
                <div className="font-medium">{it.test}</div>
                <div className="text-gray-600">
                  {it.when} · Profile: {it.profile} · Freq: {it.freq}
                </div>
              </div>
              <span className="flex-1" />
              <a className="text-sm underline" href={`/report/${it.id}`}>View report</a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
