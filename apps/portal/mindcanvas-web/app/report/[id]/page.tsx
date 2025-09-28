import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ReportClient from './ReportClient';

/** Flow letters used by the scoring/result */
type Flow = 'A' | 'B' | 'C' | 'D';

/** Map flow letters to human labels used in the report */
const FLOW_LABELS: Record<Flow, string> = {
  A: 'Catalyst',
  B: 'Communications',
  C: 'Rhythmic',
  D: 'Observer',
};

/** Your per-profile brand colors (HEX) */
const PROFILE_COLORS: Record<string, string> = {
  P1: '#175f15',
  P2: '#2ecc2f',
  P3: '#ea430e',
  P4: '#f52905',
  P5: '#f3c90d',
  P6: '#f8ee18',
  P7: '#5d5d5d',
  P8: '#8a8583',
};

/** Local image helper: expects /public/profiles/p1.png ... p8.png (or change as you prefer) */
function profileImagePath(code?: string | null) {
  const c = (code ?? '').toUpperCase();
  const n = c.startsWith('P') ? c.slice(1) : '';
  return n ? `/profiles/p${n}.png` : '';
}

type ResultRow = {
  submission_id: string;
  profile_code: string | null;
  flow_a: number | null;
  flow_b: number | null;
  flow_c: number | null;
  flow_d: number | null;
};

type SubRow = { name: string | null };

type ProfileRow = {
  code: string;
  name: string;
  flow: string;                 // e.g. "Communications Coaching Flow"
  description: string | null;
  overview: string | null;
  strengths: string[] | null;
  watchouts: string[] | null;
  tips: string[] | null;
  welcome_long: string | null;
  introduction_long: string | null;
  competencies_long: string | null;
};

export const dynamic = 'force-dynamic';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1) Result (computed on finish)
  const { data: res } = await supabaseAdmin
    .from('mc_results')
    .select('submission_id, profile_code, flow_a, flow_b, flow_c, flow_d')
    .eq('submission_id', id)
    .maybeSingle<ResultRow>();
  if (!res) return notFound();

  // 2) Submission for name
  const { data: sub } = await supabaseAdmin
    .from('mc_submissions')
    .select('name')
    .eq('id', id)
    .maybeSingle<SubRow>();

  const fullName = (sub?.name ?? '').trim();
  const firstName = fullName.split(' ')[0] || 'Your';

  // 3) Pull rich copy from your new table: public.profiles
  const code = (res.profile_code ?? '').toUpperCase();
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select(
      'code, name, flow, description, overview, strengths, watchouts, tips, welcome_long, introduction_long, competencies_long',
    )
    .eq('code', code)
    .maybeSingle<ProfileRow>();

  // 4) Flow values + top flow
  const flow: Record<Flow, number> = {
    A: Number(res.flow_a ?? 0),
    B: Number(res.flow_b ?? 0),
    C: Number(res.flow_c ?? 0),
    D: Number(res.flow_d ?? 0),
  };
  const flowKeys: Flow[] = ['A', 'B', 'C', 'D'];
  const topFlow: Flow = flowKeys.reduce<Flow>(
    (best, k) => (flow[k] > flow[best] ? k : best),
    'A',
  );

  // 5) Assemble display props
  const profileColor = PROFILE_COLORS[code] ?? '#111111';
  const profileName =
    prof?.name ? `Profile ${code.slice(1)} — ${prof.name}` : `Profile ${code || '—'}`;
  const profileImage = profileImagePath(code);
  const topFlowName = FLOW_LABELS[topFlow];

  return (
    <ReportClient
      reportId={id}
      name={firstName}
      profileCode={code}
      profileName={profileName}
      profileImage={profileImage}
      profileColor={profileColor}
      flow={flow}
      topFlowName={topFlowName}
      // Rich copy from DB (all optional)
      welcome={prof?.welcome_long ?? prof?.introduction_long ?? ''}
      overview={prof?.overview ?? prof?.description ?? ''}
      strengths={prof?.strengths ?? []}
      watchouts={prof?.watchouts ?? []}
      tips={prof?.tips ?? []}
      competencies={prof?.competencies_long ?? ''}
    />
  );
}
