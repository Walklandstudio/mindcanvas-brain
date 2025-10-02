import ClientDetailClient from './ClientDetailClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Flow = { A: number; B: number; C: number; D: number };

async function loadClient(submissionId: string) {
  const sub = await supabaseAdmin
    .from('mc_submissions')
    .select('id, person_name, person_email, created_at, company, team, position')
    .eq('id', submissionId)
    .maybeSingle();

  if (sub.error) throw new Error(sub.error.message);

  const ans = await supabaseAdmin
    .from('mc_answers')
    .select('points, profile_code, flow_code, flow')
    .eq('submission_id', submissionId);

  if (ans.error) throw new Error(ans.error.message);

  const prof = await supabaseAdmin
    .from('profiles')
    .select('code, name');

  if (prof.error) throw new Error(prof.error.message);

  const quals = await supabaseAdmin
    .from('mc_qualifications')
    .select('q_key, q_label, answer_text, created_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  if (quals.error) throw new Error(quals.error.message);

  const flowTotals: Flow = { A: 0, B: 0, C: 0, D: 0 };
  const profileTotals: Record<string, number> = {};
  for (const a of ans.data ?? []) {
    const pts = Number(a.points || 0);
    const f = (a.flow_code as string) || (a.flow as string) || '';
    if (f && (f === 'A' || f === 'B' || f === 'C' || f === 'D')) (flowTotals as any)[f] += pts;
    const pc = (a.profile_code as string) || '';
    if (pc) profileTotals[pc] = (profileTotals[pc] || 0) + pts;
  }
  const total = Object.values(flowTotals).reduce((a, b) => a + b, 0) || 1;
  const flow = {
    A: Math.round((flowTotals.A / total) * 100),
    B: Math.round((flowTotals.B / total) * 100),
    C: Math.round((flowTotals.C / total) * 100),
    D: Math.round((flowTotals.D / total) * 100),
  };
  const names = new Map((prof.data ?? []).map(p => [p.code, p.name as string]));
  const profiles = Object.entries(profileTotals)
    .map(([code, pts]) => ({
      code,
      name: names.get(code) || code,
      pct: Math.round((Number(pts) / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  return {
    submissionId,
    person: {
      name: sub.data?.person_name ?? '—',
      email: sub.data?.person_email ?? '',
      company: sub.data?.company ?? '',
      team: sub.data?.team ?? '',
      position: sub.data?.position ?? '',
      createdAt: sub.data?.created_at ?? null,
    },
    flow,
    profiles,
    qualifications: quals.data ?? [],
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadClient(id);
  return <ClientDetailClient data={data} />;
}
