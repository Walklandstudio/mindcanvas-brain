'use client';

import { useEffect, useState } from 'react';

type TestRow = { id: string; slug: string; name: string; created_at: string };

export default function TestsPage() {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetch('/api/admin/tests').then(r => r.json());
      if (!active) return;
      setRows(data.items || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function copyLink(slug: string) {
    const url = `${location.origin}/test/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Test link copied!');
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tests</h2>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Slug</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.slug}</td>
                <td className="px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => copyLink(r.slug)} className="rounded-lg border px-3 py-1 hover:bg-gray-50">Copy Link</button>
                    <a href={`/create-test/framework-preview?slug=${r.slug}`} className="rounded-lg border px-3 py-1 hover:bg-gray-50">Edit</a>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No tests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="mt-3 text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
