import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Option = { id: string; label: string; points?: number | null; profileCode?: string | null; frequency?: 'A'|'B'|'C'|'D'|null };
type Question = { id: string; index: number; text: string; type: 'single'|'multi'|'info'; options: Option[]; isScored: boolean };

type LoadedSubmission = {
  submissionId: string;
  testSlug: string;
  questions: Question[];
  answers: Record<string, string | string[] | undefined>;
  finished?: boolean;
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 1) Load submission and test slug
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, finished, test:mc_tests(slug)')
    .eq('id', id)
    .maybeSingle<{ id: string; finished: boolean | null; test: { slug: string } | null }>();

  if (subErr || !sub || !sub.test) {
    return NextResponse.json({ error: subErr?.message || 'Submission not found' }, { status: 404 });
  }

  // 2) Load questions for that test (assuming mc_questions has test_id FK and an order/index)
  const { data: qrows } = await supabaseAdmin
    .from('mc_questions')
    .select('id, index, text, type, is_scored, options:mc_options(id,label,points,profile_code,frequency)')
    .eq('test_id', (await supabaseAdmin.from('mc_tests').select('id').eq('slug', sub.test.slug).single()).data?.id)
    .order('index', { ascending: true });

  const questions: Question[] = (qrows ?? []).map((q: any) => ({
    id: q.id,
    index: q.index,
    text: q.text,
    type: q.type,
    isScored: Boolean(q.is_scored),
    options: (q.options ?? []).map((o: any) => ({
      id: o.id,
      label: o.label,
      points: o.points ?? null,
      profileCode: o.profile_code ?? null,
      frequency: (o.frequency ?? null) as Option['frequency'],
    })),
  }));

  // 3) Load answers for this submission
  const { data: arows } = await supabaseAdmin
    .from('mc_answers')
    .select('question_id, selected')
    .eq('submission_id', sub.id);

  const answers: LoadedSubmission['answers'] = {};
  for (const a of arows ?? []) {
    const key = String(a.question_id);
    const sel = a.selected as unknown;
    answers[key] = Array.isArray(sel)
      ? (sel as unknown[]).map((x) => String(x))
      : typeof sel === 'string'
        ? sel
        : undefined;
  }

  const payload: LoadedSubmission = {
    submissionId: sub.id,
    testSlug: sub.test.slug,
    questions,
    answers,
    finished: Boolean(sub.finished),
  };

  return NextResponse.json(payload);
}
