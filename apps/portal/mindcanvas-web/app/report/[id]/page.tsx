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

type ProfilesNameRow = { code: string; name: string };
type ProfilesRichRow = {
  code: string;
  name: string;   // plain name (no "Profile # —")
  flow: string;   // e.g. "Communications – Rhythmic Coaching Flow"
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
  // Your project uses Promise-based params (Next 15). Keep this to avoid the build error.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1) Get the participant's name (for greeting)
  const { data: sub } = await supabaseAdmin
    .from('mc_submissions')
    .select('name')
    .eq('id', id)
    .maybeSingle<{ name: string | null }>();
  const firstName = (sub?.name ?? '').trim().split(' ')[0] || 'Your';

  // 2) Pull this submission's answers
  const { data: answers, error: aErr } = await supabaseAdmin
    .from('mc_answers')
    .select('*')
    .eq('submission_id', id);
  if (aErr) return notFound();

  // Extract chosen option ids from tolerant shapes
  const selectedIds = new Set<string>();
  for (const r of answers ?? []) {
    const row = r as Row;
    const payload =
      row['value'] ??
      row['selected'] ??
      row['answer'] ??
      row['option_id'] ??
      row['selected_ids'] ??
      row['choices'] ??
      null;
    if (Array.isArray(payload)) for (const v of payload as unknown[]) selectedIds.add(String(v));
    else if (payload != null) selectedIds.add(String(payload));
  }
  if (selectedIds.size === 0) return notFound();

  // 3) Options (for profile points) + their question ids/points
  const { data: opts, error: oErr } = await supabaseAdmin
    .from('mc_options')
    .select('id, question_id, profile_code, points')
    .in('id', Array.from(selectedIds));
  if (oErr || !opts) return notFound();

  // 4) Fetch flows for those questions (for the *flow* pie)
  const qIds = Array.from(new Set(opts.map((o) => (o as Row).question_id as string))).filter(Boolean);
  const { data: qrows, error: qErr } = await supabaseAdmin
    .from('mc_questions')
    .select('id, flow')
    .in('id', qIds);
  if (qErr || !qrows) return notFound();

  const flowByQ = new Map<string, Flow>();
  for (const q of qrows) {
    const row = q as Row;
    const f = (str(row, 'flow') ?? '') as string;
    if (f === 'A' || f === 'B' || f === 'C' || f === 'D') flowByQ.set(String(row.id), f);
  }

  // 5) Tally profiles (bars) and flows (pie) from answers
  const profilePoints: Record<string, number> = {};
  const flowPoints: Record<Flow, number> = { A: 0, B: 0, C: 0, D: 0 };

  for (const o of opts) {
    const row = o as Row;
    const qid = str(row, 'question_id');
    const pts = num(row, 'points', 1);

    const pcode = (str(row, 'profile_code') ?? '').toUpperCase();
    if (pcode) profilePoints[pcode] = (profilePoints[pcode] ?? 0) + pts;

    const f = qid ? flowByQ.get(qid) : undefined;
    if (f) flowPoints[f] = (flowPoints[f] ?? 0) + pts;
  }

  // 6) Flow → percentages + dominant flow label
  const flowTotal = (flowPoints.A ?? 0) + (flowPoints.B ?? 0) + (flowPoints.C ?? 0) + (flowPoints.D ?? 0);
  const flowPct: Record<Flow, number> = {
    A: flowTotal ? Math.round((flowPoints.A / flowTotal) * 100) : 0,
    B: flowTotal ? Math.round((flowPoints.B / flowTotal) * 100) : 0,
    C: flowTotal ? Math.round((flowPoints.C / flowTotal) * 100) : 0,
    D: flowTotal ? Math.round((flowPoints.D / flowTotal) * 100) : 0,
  };
  const topFlow = (['A', 'B', 'C', 'D'] as Flow[]).reduce<Flow>(
    (best, k) => (flowPct[k] > flowPct[best] ? k : best),
    'A',
  );
  const topFlowName = FLOW_LABELS[topFlow];

  // 7) Primary profile and bar data (Primary first)
  const entriesSorted = Object.entries(profilePoints).sort((a, b) => b[1] - a[1]);
  const primaryCode = entriesSorted[0]?.[0] ?? 'P1';
  const totalPts = entriesSorted.reduce((acc, [, v]) => acc + v, 0);
  const orderedCodes = [primaryCode, ...entriesSorted.map(([c]) => c).filter((c) => c !== primaryCode)];

  // Names for profiles (plain — no "Profile # —")
  const { data: pnames } = (await supabaseAdmin
    .from('profiles')
    .select('code, name')
    .in('code', orderedCodes)) as unknown as { data: ProfilesNameRow[] | null };
  const nameByCode = new Map<string, string>((pnames ?? []).map((r) => [r.code.toUpperCase(), r.name]));

  const profileBreakdown = orderedCodes.map((code) => {
    const pts = profilePoints[code] ?? 0;
    const pct = totalPts > 0 ? Math.round((pts / totalPts) * 100) : code === primaryCode ? 100 : 0;
    return { code, name: nameByCode.get(code) ?? code, pct, color: PROFILE_COLORS[code] ?? '#444444' };
  });

  // 8) Rich copy for primary (and its own flow descriptor)
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select(
      'code, name, flow, description, overview, strengths, watchouts, tips, welcome_long, introduction_long, competencies_long',
    )
    .eq('code', primaryCode)
    .maybeSingle<ProfilesRichRow>();

  const profileName = prof?.name ?? primaryCode;
  const profileFlowDescriptor = prof?.flow ?? '';
  const profileImage = profileImagePath(primaryCode);
  const profileColor = PROFILE_COLORS[primaryCode] ?? '#111111';

  const welcome = prof?.welcome_long ?? prof?.introduction_long ?? '';
  const overview = prof?.overview ?? prof?.description ?? '';
  const strengths = prof?.strengths ?? [];
  const watchouts = prof?.watchouts ?? [];
  const tips = prof?.tips ?? [];
  const competencies = prof?.competencies_long ?? '';

  // 9) Offer a static PDF for this primary profile (if present in /public/reports/pdfs)
  const staticPdfUrl = `/reports/pdfs/${primaryCode}.pdf`;

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
      flow={flowPct}                 // <- pie uses computed flow %
      topFlowName={topFlowName}
      profileBreakdown={profileBreakdown}
      welcome={welcome}
      overview={overview}
      strengths={strengths}
      watchouts={watchouts}
      tips={tips}
      competencies={competencies}
      staticPdfUrl={staticPdfUrl}    // <- smart download tries this first
    />
  );
}
