'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Member = { id: string; name: string; exact: string };
type Matrix = Record<string, Record<string, number | null>>;

function cellColor(v: number | null): string {
  if (v === null) return 'bg-gray-50';
  // -2..+2 -> red..green
  const scale = Math.max(-2, Math.min(2, v));
  if (scale >= 1.5) return 'bg-green-200';
  if (scale >= 0.5) return 'bg-green-100';
  if (scale <= -1.5) return 'bg-red-200';
  if (scale <= -0.5) return 'bg-red-100';
  return 'bg-white';
}

export default function TeamAnalyticsPage({ params }: { params: { id: string; team: string } }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [teamScore, setTeamScore] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [matrix, setMatrix] = useState<Matrix>({});
  const [counts, setCounts] = useState<{A:number;B:number;C:number;D:number}>({A:0,B:0,C:0,D:0});

  async function token(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace('/login'); throw new Error('no session'); }
    return data.session.access_token;
  }

  useEffect(() => {
    (async () => {
      const tkn = await token();
      const r = await fetch(`/api/tests/${params.id}/teams/${encodeURIComponent(params.team)}/analytics`, {
        headers: { Authorization: `Bearer ${tkn}` }
      });
      const j = await r.json();
      if (j?.ok) {
        setTeamName(j.data.team);
        setTeamScore(j.data.team_score);
        setMembers(j.data.members || []);
        setMatrix(j.data.matrix || {});
        setCounts(j.data.counts || {A:0,B:0,C:0,D:0});
      }
      setLoading(false);
    })().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keys = useMemo(() => ['A1','A2','B1','B2','C1','C2','D1','D2'], []);

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-6xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team: {teamName}</h1>
        <div className="text-sm">
          <a className="underline mr-4" href={`/tests/${params.id}/teams`}>All teams</a>
          <a className="underline" href={`/tests/${params.id}/takers`}>All takers</a>
        </div>
      </div>

      <section className="rounded-lg border p-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-gray-500">Team score</div>
            <div className="text-2xl font-semibold">{teamScore}</div>
          </div>
          <div className="flex gap-4 text-sm">
            <div>A: {counts.A}</div>
            <div>B: {counts.B}</div>
            <div>C: {counts.C}</div>
            <div>D: {counts.D}</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Profile</th>
              {keys.map(k => <th key={k} className="px-3 py-2 text-center">{k}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {keys.map(row => (
              <tr key={row}>
                <td className="px-3 py-2 font-medium">{row}</td>
                {keys.map(col => (
                  <td key={col} className={`px-3 py-2 text-center ${cellColor((matrix[row] ?? {})[col] ?? null)}`}>
                    {((matrix[row] ?? {})[col] ?? '') as any}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-medium">Members</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {members.map(m => (
            <li key={m.id} className="rounded border px-3 py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name || 'Unnamed'}</div>
                <div className="text-xs text-gray-500">{m.id}</div>
              </div>
              <div className="rounded border px-2 py-1 text-sm">{m.exact}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
