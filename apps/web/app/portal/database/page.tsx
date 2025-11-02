"use client";
import { useEffect, useState } from "react";

export default function PortalDatabase() {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/portal/people", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load database");
        setData(j.people ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-slate-500">Loading database…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data?.length)
    return <div className="p-6 text-slate-500">No test takers yet.</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Test Takers</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-slate-100 text-left text-sm">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Profile</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p: any) => (
            <tr key={p.id} className="border-t text-sm">
              <td className="p-2">{p.first_name} {p.last_name}</td>
              <td className="p-2">{p.email}</td>
              <td className="p-2">{p.profile_name ?? "—"}</td>
              <td className="p-2">{p.status ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
