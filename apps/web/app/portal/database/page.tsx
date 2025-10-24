"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  email: string | null;
  full_name: string | null; // if you store it
  frequency: string | null;
  profile: string | null;
  created_at: string | null;
};

export default function DatabasePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/test-takers")
      .then(r => r.json())
      .then(d => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Database</h1>
      {loading ? <div>Loading…</div> : (
        <div className="bg-white border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Frequency</th>
                <th className="p-3">Profile</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Link className="text-blue-600 underline" href={`/portal/database/${r.id}`}>
                      {r.full_name ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3">{r.email ?? "—"}</td>
                  <td className="p-3">{r.frequency ?? "—"}</td>
                  <td className="p-3">{r.profile ?? "—"}</td>
                  <td className="p-3">{r.created_at?.slice(0,10) ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={5}>No test takers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
