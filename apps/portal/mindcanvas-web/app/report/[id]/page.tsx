import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Flow = 'A' | 'B' | 'C' | 'D';

const FLOW_LABELS: Record<Flow, string> = {
  A: 'Catalyst',
  B: 'Communications',
  C: 'Rhythmic',
  D: 'Observer',
};

// P1–P8 brand colors
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
type ProfilesNameRow = { code: string; name: string };
type ProfilesRichRow = {
  code: string;
  name: string;
  flow: string; // e.g., "Communications – Rhythmic Coaching Flow"
  description: string | null;
  overview: string | null;
  strengths: string[] | null;
  watchouts: string[] | null;
  tips: string[] | null;
  welcome_long: string | null;
  introduction_long: string | null;
  competencies_long: string | null;
};

type Row = Record<string, unknown>;
const str = (r: Row, k: string) =>
  typeof r[k] === 'string' ? (r[k] as string) : r[k] == null ? null : String(r[k]);
const num = (r: Row, k: string, d = 0) => {
  const v = r[k];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return d;
};

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1) Flow + primary profile (computed by /finish)
  const { data: res } = await supabaseAdmin
    .from('mc_results')
    .select('submission_id, profile_code, flow_a, flow_b, flow_c, flow_d')
    .eq('submission_id', id)
    .maybeSingle<ResultRow>();
  if (!res) return notFound();

  // 2) Person name
  const { data: sub } = await supabaseAdmin
    .from('mc_submissions')
    .select('name')
    .eq('id', id)
    .maybeSingle<SubRow>();
  const firstName = (sub?.name ?? '').trim().split(' ')[0] || 'Your';

  // 3) Flow structure for pie + dominant flow label
  const flow: Record<Flow, number> = {
    A: Number(res.flow_a ?? 0),
    B: Number(res.flow_b ?? 0),
    C: Number(res.flow_c ?? 0),
    D: Number(res.flow_d ?? 0),
  };
  const flowKeys: Flow[] = ['A', 'B', 'C', 'D'];
  const topFlow: Flow = flowKeys.reduce<Flow>((best, k) => (flow[k] > flow[best] ? k : best), 'A');
  const topFlowName = FLOW_LABELS[topFlow];

  // 4) Profile breakdown (re-tally options → profile_code for bars)
  const { data: answers } = await supabaseAdmin
    .from('mc_answers')
    .select('*')
    .eq('submission_id', id);

  const selectedIds = new Set<string>();
  for (const r of answers ?? []) {
    const row = r as Row;
    const candidate =
      row['value'] ?? row['selected'] ?? row['answer'] ?? row['option_id'] ?? row['selected_ids'] ?? row['choices'] ?? null;
    if (Array.isArray(candidate)) for (const v of candidate as unknown[]) selectedIds.add(String(v));
    else if (candidate != null) selectedIds.add(String(candidate));
  }

  const profilePoints: Record<string, number> = {};
  if (selectedIds.size) {
    const { data: opts } = await supabaseAdmin
      .from('mc_options')
      .select('id, profile_code, points')
      .in('id', Array.from(selectedIds));
    for (const o of opts ?? []) {
      const row = o as Row;
      const pcode = (str(row, 'profile_code') ?? '').toUpperCase();
      if (!pcode) continue;
      profilePoints[pcode] = (profilePoints[pcode] ?? 0) + num(row, 'points', 1);
    }
  }

  const primaryCode = (res.profile_code ?? '').toUpperCase() || 'P1';
  if (!profilePoints[primaryCode]) profilePoints[primaryCode] = profilePoints[primaryCode] ?? 0;

  const totalPts = Object.values(profilePoints).reduce((a, b) => a + b, 0);
  const codesSorted = Object.entries(profilePoints)
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);
  const orderedCodes = [primaryCode, ...codesSorted.filter((c) => c !== primaryCode)];

  // Fetch plain names (no "Profile # —")
  const { data: nameRows } = await supabaseAdmin
    .from('profiles')
    .select('code, name')
    .in('code', orderedCodes) as unknown as { data: ProfilesNameRow[] | null };

  const nameByCode = new Map<string, string>(
    (nameRows ?? []).map((r) => [r.code.toUpperCase(), r.name]),
  );

  const profileBreakdown = orderedCodes.map((code) => {
    const pts = profilePoints[code] ?? 0;
    const pct = totalPts > 0 ? Math.round((pts / totalPts) * 100) : code === primaryCode ? 100 : 0;
    return {
      code,
      // IMPORTANT: just the name (no "Profile # —")
      name: nameByCode.get(code) ?? code,
      pct,
      color: PROFILE_COLORS[code] ?? '#444444',
    };
  });

  // 5) Rich copy + the profile’s own coaching-flow descriptor
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select(
      'code, name, flow, description, overview, strengths, watchouts, tips, welcome_long, introduction_long, competencies_long',
    )
    .eq('code', primaryCode)
    .maybeSingle<ProfilesRichRow>();

  const profileName = prof?.name ?? `Profile ${primaryCode.slice(1)}`;
  const profileFlowDescriptor = prof?.flow ?? '';
  const profileImage = profileImagePath(primaryCode);
  const profileColor = PROFILE_COLORS[primaryCode] ?? '#111111';

  const welcome = prof?.welcome_long ?? prof?.introduction_long ?? '';
  const overview = prof?.overview ?? prof?.description ?? '';
  const strengths = prof?.strengths ?? [];
  const watchouts = prof?.watchouts ?? [];
  const tips = prof?.tips ?? [];
  const competencies = prof?.competencies_long ?? '';

  const ReportClient = (await import('./ReportClient')).default;

  return (
    <ReportClient
      reportId={id}
      name={firstName}
      profileCode={primaryCode}
      profileName={profileName}
      profileFlowDescriptor={profileFlowDescriptor}
      profileImage={profileImage}
      profileColor={profileColor}
      flow={flow}
      topFlowName={topFlowName}
      profileBreakdown={profileBreakdown}
      welcome={welcome}
      overview={overview}
      strengths={strengths}
      watchouts={watchouts}
      tips={tips}
      competencies={competencies}
    />
  );
}
