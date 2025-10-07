'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ApiPayload = {
  org_name: string;
  test_name: string;
  taker: { first_name: string|null; last_name: string|null };
  freq_scores: { A:number; B:number; C:number; D:number };
  top_freq: 'A'|'B'|'C'|'D';
  profile: { key: string; name: string; color: string; description?: string|null };
  sections_order: string[];
  sections: Record<string, string>;
};

export default function ReportPage(props: any) {
  const token: string = (props?.params?.token as string) || '';
  const sp = useSearchParams();
  const tid: string = sp.get('tid') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiPayload | null>(null);

  useEffect(() => {
    if (!token || !tid) return;
    (async () => {
      const r = await fetch(`/api/public/test/${token}/report?tid=${encodeURIComponent(tid)}`);
      const j = await r.json();
      if (j?.ok) setData(j.data as ApiPayload);
      setLoading(false);
    })();
  }, [token, tid]);

  if (!tid) return <main className="p-8">Missing participant id.</main>;
  if (loading) return <main className="p-8">Loading…</main>;
  if (!data) return <main className="p-8">No report available.</main>;

  const fullName = [data.taker.first_name, data.taker.last_name].filter(Boolean).join(' ') || 'Participant';

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10 bg-white text-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 print:border-none">
        <div>
          <div className="text-xs text-gray-500">{data.org_name}</div>
          <h1 className="text-2xl font-bold">Signature Profiling Report</h1>
          <div className="text-sm text-gray-600">{data.test_name}</div>
        </div>
        <button
          onClick={() => window.print()}
          className="hidden print:hidden md:inline-block rounded-md border px-3 py-1 text-sm"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Participant + Profile */}
      <section className="mt-6 rounded-lg border p-4 print:border">
        <div className="text-sm text-gray-600">Participant</div>
        <div className="text-lg font-medium">{fullName}</div>

        <div className="mt-4 rounded-lg p-4" style={{ border: '1px solid #eee', background: '#fafafa' }}>
          <div className="text-sm text-gray-600">Profile</div>
          <div className="text-2xl font-semibold" style={{ color: data.profile.color }}>
            {data.profile.name} <span className="text-gray-400">({data.profile.key})</span>
          </div>
          {data.profile.description && (
            <p className="mt-2 text-sm text-gray-700">{data.profile.description}</p>
          )}
        </div>
      </section>

      {/* Frequency summary */}
      <section className="mt-6 rounded-lg border p-4 print:border">
        <div className="font-medium">Frequencies</div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {(['A','B','C','D'] as const).map(k => {
            const v = data.freq_scores[k];
            const maxAbs = Math.max(1, ...Object.values(data.freq_scores).map(Math.abs));
            const pct = Math.round((Math.abs(v)/maxAbs)*100);
            return (
              <div key={k}>
                <div className="flex items-center justify-between text-sm">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded">
                  <div className="h-2 rounded" style={{ width: `${pct}%`, backgroundColor: data.profile.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sections */}
      <section className="mt-6 space-y-6">
        {data.sections_order.map((s) => {
          const text = (data.sections?.[s] || '').trim();
          if (!text) return null;
          return (
            <div key={s} className="rounded-lg border p-4 print:border">
              <div className="text-sm text-gray-600">{s.replace(/_/g,' ')}</div>
              <div className="mt-1 whitespace-pre-wrap leading-relaxed">{text}</div>
            </div>
          );
        })}
      </section>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          html, body { background: white; }
          main { box-shadow: none !important; }
          .print\\:hidden { display: none !important; }
          .print\\:border { border: 1px solid #e5e7eb !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>
    </main>
  );
}
