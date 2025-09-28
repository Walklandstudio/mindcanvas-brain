'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ClientListItem = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  profile_code: string | null;
  flow_a: number;
  flow_b: number;
  flow_c: number;
  flow_d: number;
};

export default function ClientsPage() {
  const [data, setData] = useState<ClientListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        setData(null);
        const res = await fetch('/api/admin/clients', { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const rows = (await res.json()) as ClientListItem[];
        if (alive) setData(rows);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((r) => {
      const hay = `${r.name} ${r.email} ${r.phone}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [data, q]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="w-80 rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Profile</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}

            {data && rows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={5}>
                  No results
                </td>
              </tr>
            )}

            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">{r.name || '—'}</td>
                <td className="px-4 py-3">{r.email || '—'}</td>
                <td className="px-4 py-3">{r.profile_code ?? '—'}</td>
                <td className="px-4 py-3">
                  {new Date(r.created_at).toLocaleString([], {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/clients/${r.id}`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
