'use client';

import { useEffect, useState } from 'react';

export default function ReportPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<any>(null);

  useEffect(() => { (async () => {
    const r = await fetch(`/api/submissions/${id}/report`);
    const j = await r.json(); setData(j);
  })(); }, [id]);

  if (!data) return <div className="p-6">Loading…</div>;

  const flows = data.flow_scores || {};
  const profiles = data.profile_scores || {};

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Your Report</h1>

      <section className="border rounded p-4">
        <div className="text-sm text-gray-500">Coaching Flow</div>
        <div className="text-xl font-semibold">{data.flow_name} ({data.full_frequency})</div>
      </section>

      <section className="border rounded p-4">
        <div className="text-sm text-gray-500">Profile</div>
        <div className="text-xl font-semibold">{data.profile_name} ({data.full_profile_code})</div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Flow scores</h3>
        {['A','B','C','D'].map(k => (
          <div key={k} className="mb-2">
            <div className="text-sm">{k}: {flows[k] ?? 0}</div>
            <div className="h-2 bg-gray-200 rounded"><div className="h-2 bg-black rounded" style={{ width: `${Math.min(100, flows[k]||0)}%` }} /></div>
          </div>
        ))}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Profile scores</h3>
        {['P1','P2','P3','P4','P5','P6','P7','P8'].map(k => (
          <div key={k} className="mb-2">
            <div className="text-sm">{k}: {profiles[k] ?? 0}</div>
            <div className="h-2 bg-gray-200 rounded"><div className="h-2 bg-black rounded" style={{ width: `${Math.min(100, profiles[k]||0)}%` }} /></div>
          </div>
        ))}
      </section>

      <div className="text-sm text-gray-500">Taken at: {new Date(data.taken_at).toLocaleString()}</div>
    </div>
  );
}
