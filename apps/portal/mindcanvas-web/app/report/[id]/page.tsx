import ReportClient from './ReportClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Flow = { A: number; B: number; C: number; D: number };
type ProfileRow = { code: string; name: string; pct: number; colorHex?: string };

async function loadReportData(submissionId: string) {
  const person = await supabaseAdmin
    .from('mc_submissions')
    .select('person_name, person_email')
    .eq('id', submissionId)
    .maybeSingle();

  if (person.error) throw new Error(person.error.message);

  const ans = await supabaseAdmin
    .from('mc_answers')
    .select('points, profile_code, flow_code, flow')
    .eq('submission_id', submissionId);

  if (ans.error) throw new Error(ans.error.message);

  const prof = await supabaseAdmin
    .from('profiles')
    .select('code, name')
    .order('code');

  if (prof.error) throw new Error(prof.error.message);

  const sumBy = (arr: number[]) => arr.reduce((a, b) => a + (b || 0), 0);

  const flowTotals: Flow = { A: 0, B: 0, C: 0, D: 0 };
  const profileTotals: Record<string, number> = {};

  for (const a of ans.data ?? []) {
    const pts = Number(a.points || 0);
    const f = (a.flow_code as string) || (a.flow as string) || '';
    if (f && (f === 'A' || f === 'B' || f === 'C' || f === 'D')) (flowTotals as any)[f] += pts;
    const pc = (a.profile_code as string) || '';
    if (pc) profileTotals[pc] = (profileTotals[pc] || 0) + pts;
  }

  const flowSum = sumBy(Object.values(flowTotals));
  const flow: Flow = {
    A: flowSum ? Math.round((flowTotals.A / flowSum) * 100) : 0,
    B: flowSum ? Math.round((flowTotals.B / flowSum) * 100) : 0,
    C: flowSum ? Math.round((flowTotals.C / flowSum) * 100) : 0,
    D: flowSum ? Math.round((flowTotals.D / flowSum) * 100) : 0,
  };

  const profilesIndex = new Map((prof.data ?? []).map(p => [p.code, p.name as string]));
  const profiles: ProfileRow[] = Object.entries(profileTotals).map(([code, pts]) => ({
    code,
    name: profilesIndex.get(code) || code,
    pct: flowSum ? Math.round((Number(pts) / flowSum) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct);

  return {
    person: { name: person.data?.person_name ?? '—' },
    flow,
    profiles,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadReportData(id);
  return <ReportClient data={data} reportId={id} />;
}
