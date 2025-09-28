import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ReportClient from './ReportClient';
import { PROFILE_META, FLOW_LABELS, safeHex, profileImagePath } from '@/lib/profileMeta';

type ResultRow = {
  submission_id: string;
  profile_code: string | null;
  flow_a: number | null; flow_b: number | null; flow_c: number | null; flow_d: number | null;
};
type SubRow = { name: string | null };

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: res } = await supabaseAdmin
    .from('mc_results')
    .select('submission_id, profile_code, flow_a, flow_b, flow_c, flow_d')
    .eq('submission_id', id)
    .maybeSingle<ResultRow>();
  if (!res) return notFound();

  const { data: sub } = await supabaseAdmin
    .from('mc_submissions')
    .select('name')
    .eq('id', id)
    .maybeSingle<SubRow>();

  const fullName = (sub?.name ?? '').trim();
  const firstName = fullName.split(' ')[0] || 'Your';

  const code = (res.profile_code ?? '').toUpperCase();
  const meta = PROFILE_META[code as keyof typeof PROFILE_META];

  const profileName = meta?.name ? `Profile ${code.slice(1)} — ${meta.name}` : `Profile ${code || '—'}`;
  const profileColor = safeHex(meta?.color);
  const imageUrl = profileImagePath(code);

  const flow = {
    A: Number(res.flow_a ?? 0),
    B: Number(res.flow_b ?? 0),
    C: Number(res.flow_c ?? 0),
    D: Number(res.flow_d ?? 0),
  };
  const topFlow = (Object.entries(flow) as any[]).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'A';
  const topFlowName = FLOW_LABELS[topFlow as keyof typeof FLOW_LABELS];

  return (
    <ReportClient
      reportId={id}
      name={firstName}
      profileCode={code}
      profileName={profileName}
      profileImage={imageUrl}
      profileColor={profileColor}
      flow={flow}
      topFlow={topFlow as any}
      topFlowName={topFlowName}
      welcome={`Welcome, ${firstName}!`}        // replace if you store custom copy per profile
      outline={`This profile reflects your core coaching style.`} // replace with db copy if available
    />
  );
}
