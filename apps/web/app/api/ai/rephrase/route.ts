import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

/**
 * 🔧 EDIT ME to match your “CONFIDENTIAL_ Base Questions Mock UP” exactly.
 * Each entry: label (string) + weight (number). kind defaults to 'scale' (Likert), but you can change.
 * If you need segmentation questions, add them later in the UI or add here with is_segmentation: true and weight: 0.
 */
const BASE_QUESTIONS: Array<{
  label: string;
  weight: number;
  kind?: 'scale' | 'text' | 'single' | 'multi';
  options?: any;
}> = [
  // TODO: Replace these placeholders with your exact 15 questions + weights from the doc.
  { label: 'I prefer starting things and driving momentum quickly.', weight: 2 },
  { label: 'I am comfortable making decisions even with limited information.', weight: 2 },
  { label: 'I energize others and communicate ideas clearly and persuasively.', weight: 1 },
  { label: 'I value structure, systems, and consistency in execution.', weight: 1 },
  { label: 'I pay attention to details and follow-through thoroughly.', weight: 1 },
  { label: 'I enjoy exploring multiple options and creative solutions.', weight: 1 },
  { label: 'I remain calm under pressure and bring stability to teams.', weight: 1 },
  { label: 'I like optimizing processes for efficiency and reliability.', weight: 1 },
  { label: 'I enjoy collaborating and building relationships across teams.', weight: 1 },
  { label: 'I learn fast and adapt my approach when new data emerges.', weight: 1 },
  { label: 'I naturally take ownership and move initiatives forward.', weight: 2 },
  { label: 'I’m motivated by measurable outcomes and clear targets.', weight: 1 },
  { label: 'I am comfortable giving/receiving direct feedback.', weight: 1 },
  { label: 'I bring analytical thinking to clarify ambiguity.', weight: 1 },
  { label: 'I can translate a vision into actionable steps.', weight: 2 },
];

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const orgId = await orgIdFromAuth(auth);
    if (!orgId) return NextResponse.json({ ok: false, error: 'no_org' }, { status: 401 });

    const a = admin();

    // If already seeded (>= 10 questions), skip
    const { count } = await a
      .from('org_questions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // build rows
    const rows = BASE_QUESTIONS.map((q, i) => ({
      org_id: orgId,
      label: q.label,
      kind: q.kind ?? 'scale',
      options: q.options ?? [{ min: 1, max: 5 }], // Likert hint
      weight: q.kind === 'text' ? 0 : q.weight,   // text has no score
      is_segmentation: false,
      active: true,
      display_order: i + 1,
    }));

    const { error } = await a.from('org_questions').insert(rows);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
