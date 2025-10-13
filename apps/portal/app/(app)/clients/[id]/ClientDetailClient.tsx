'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';

type Flow = { A: number; B: number; C: number; D: number };
type ProfileRow = { code: string; name: string; pct: number };

export default function ClientDetailClient({
  data,
}: {
  data: {
    submissionId: string;
    person: { name: string; email: string; company: string; team: string; position: string; createdAt: string | null };
    flow: Flow;
    profiles: ProfileRow[];
    qualifications: { q_key: string; q_label: string; answer_text: string | null }[];
  };
}) {
  const flowRows = [
    { label: 'Catalyst', value: data.flow.A },
    { label: 'Communications', value: data.flow.B },
    { label: 'Rhythmic', value: data.flow.C },
    { label: 'Observer', value: data.flow.D },
  ].sort((a, b) => b.value - a.value);

  const profileRows = [...data.profiles].sort((a, b) => b.pct - a.pct).map(p => ({
    label: p.name,
    value: p.pct,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Client</h1>
        <p className="text-sm text-gray-600">
          {data.person.name} • {data.person.email} {data.person.company ? `• ${data.person.company}` : ''}
          {data.person.team ? ` • ${data.person.team}` : ''} {data.person.position ? ` • ${data.person.position}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium">Coaching Flow</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={flowRows} margin={{ left: 16, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="label" width={160} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Profiles</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={profileRows} margin={{ left: 16, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="label" width={220} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {data.qualifications.length > 0 && (
        <>
          <hr className="my-8 border-gray-200" />
          <section>
            <h2 className="mb-3 text-lg font-medium">Additional Answers</h2>
            <div className="space-y-3">
              {data.qualifications.map(q => (
                <div key={q.q_key} className="rounded-lg border p-3">
                  <div className="text-sm font-medium">{q.q_label}</div>
                  <div className="text-sm text-gray-700">{q.answer_text || '—'}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
