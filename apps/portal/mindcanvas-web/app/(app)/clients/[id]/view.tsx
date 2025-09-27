'use client';

import { useEffect, useState } from 'react';

type Answer = { question: string; selected: string | string[] };
type Detail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  profile_code: string | null;
  flow: { A: number; B: number; C: number; D: number } | null;
  answers: Answer[];
  report_id?: string;
};

export default function ClientDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/admin/clients/${id}`).then(r => r.json());
      if (!active) return;
      setData(res);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <div>Loading…</div>;
  if (!data) return <div>Not found.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{data.name || 'Client'}</h2>
            <p className="text-sm text-gray-500">{data.email || '—'} • {data.phone || '—'}</p>
          </div>
          {data.report_id ? (
            <a className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50" href={`/report/${data.report_id}`} target="_blank">
              View Report
            </a>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Profile</div>
            <div className="text-lg font-semibold">{data.profile_code || '—'}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Flow (A/B/C/D)</div>
            <div className="text-lg font-semibold">
              {data.flow ? `${data.flow.A}/${data.flow.B}/${data.flow.C}/${data.flow.D}` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-3 text-sm font-medium">Answers</div>
        <div className="divide-y">
          {data.answers.map((a, i) => (
            <div key={i} className="px-5 py-3">
              <div className="text-sm font-medium">{a.question}</div>
              <div className="text-sm text-gray-700">
                {Array.isArray(a.selected) ? a.selected.join(', ') : a.selected}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
