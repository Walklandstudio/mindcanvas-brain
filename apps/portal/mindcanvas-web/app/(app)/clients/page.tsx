'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ClientRow = {
  id: string;              // submission_id or person_id
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  profile_code: string | null;
  flow: { A: number; B: number; C: number; D: number } | null;
};

export default function ClientsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const data = await fetch('/api/admin/clients').then(r => r.json());
      if (!active) return;
      setRows(data.items || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s)
    );
  }, [q, rows]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clients</h2>
        <input
          className="w-64 rounded-lg border px-3 py-2 text-sm"
          placeholder="Search name or email"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Profile</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.name || '—'}</td>
                <td className="px-4 py-2">{r.email || '—'}</td>
                <td className="px-4 py-2">{r.profile_code || '—'}</td>
                <td className="px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <Link className="rounded-lg border px-3 py-1 hover:bg-gray-50" href={`/clients/${r.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={5}>No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <div className="mt-3 text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
