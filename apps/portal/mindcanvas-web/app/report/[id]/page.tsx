import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ReportClient from './ReportClient';

type ResultRow = {
  submission_id: string;
  report_id: string | null;
  profile_code: string | null;
  flow_a: number | null;
  flow_b: number | null;
  flow_c: number | null;
  flow_d: number | null;
};

type SubRow = { name: string | null };

type ProfRow = {
  code: string;
  name: string | null;
  image_url: string | null;
  color: string | null;         // optional brand color for the profile
  welcome: string | null;       // “welcome” / intro text
  outline: string | null;       // outline/description
};

export const dynamic = 'force-dynamic';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1) result (we stored report_id = submission_id on finish)
  const { data: res, error: rErr } = await supabaseAdmin
    .from('mc_results')
    .select('submission_id, report_id, profile_code, flow_a, flow_b, flow_c, flow_d')
    .eq('submission_id', id)
    .maybeSingle<ResultRow>();

  if (rErr || !res) return notFound();

  // 2) submission (for name)
  const { data: sub } = await supabaseAdmin
    .from('mc_submissions')
    .select('name')
    .eq('id', id)
    .maybeSingle<SubRow>();

  const fullName = (sub?.name ?? '').trim();
  const firstName = fullName.split(' ')[0] || 'Your';

  // 3) profile content
  const code = (res.profile_code ?? '').toUpperCase();
  const { data: prof } = await supabaseAdmin
    .from('mc_profiles')
    .select('code, name, image_url, color, welcome, outline')
    .eq('code', code)
    .maybeSingle<ProfRow>();

  const profileName = prof?.name ?? `Profile ${code || '—'}`;
  const profileImage = prof?.image_url ?? '';
  const welcome = prof?.welcome ?? '';
  const outline = prof?.outline ?? '';

  // 4) flow
  const flow = {
    A: Number(res.flow_a ?? 0),
    B: Number(res.flow_b ?? 0),
    C: Number(res.flow_c ?? 0),
    D: Number(res.flow_d ?? 0),
  };
  const flowEntries = Object.entries(flow) as Array<['A'|'B'|'C'|'D', number]>;
  const topFlow = flowEntries.sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'A';

  // Optional: per-profile color could tint the hero
  const profileColor = prof?.color ?? '#111111';

  return (
    <ReportClient
      reportId={id}
      name={firstName}
      profileCode={code}
      profileName={profileName}
      profileImage={profileImage}
      profileColor={profileColor}
      flow={flow}
      topFlow={topFlow}
      welcome={welcome}
      outline={outline}
    />
  );
}
