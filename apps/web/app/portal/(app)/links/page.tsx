"use client";

import { useEffect, useState } from "react";

type LinkRow = {
  id: string;
  token: string;
  test_id: string;
  test_name?: string;
  use_count?: number | null;
  max_uses?: number | null;
  expires_at?: string | null;
  created_at?: string | null;
};

export default function LinksManagerPage() {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch("/api/portal/links/list", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setRows(Array.isArray(j.links) ? j.links : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this link? This cannot be undone.")) return;
    const res = await fetch("/api/portal/links", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok && res.status !== 204) {
      const t = await res.text().catch(() => "");
      alert(`Failed to delete: ${t || res.status}`);
      return;
    }
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Test Links</h1>
        <a
          href="/portal/tests"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          ← Back to Tests
        </a>
      </header>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">No links yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Token</th>
                <th className="py-2 pr-4">Test</th>
                <th className="py-2 pr-4">Uses</th>
                <th className="py-2 pr-4">Max</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 font-mono">{r.token}</td>
                  <td className="py-2 pr-4">{r.test_name || r.test_id}</td>
                  <td className="py-2 pr-4">{r.use_count ?? 0}</td>
                  <td className="py-2 pr-4">{r.max_uses ?? "—"}</td>
                  <td className="py-2 pr-4">{r.expires_at ? new Date(r.expires_at).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-4">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => del(r.id)}
                      className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
