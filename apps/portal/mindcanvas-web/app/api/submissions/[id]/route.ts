import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Freq = 'A' | 'B' | 'C' | 'D' | null;

type OptionRow = {
  id: string;
  label: string;
  points: number | null;
  profile_code: string | null;
  frequency: Freq;
};

type QuestionRow = {
  id: string;
  index: number;
  text: string;
  type: 'single' | 'multi' | 'info';
  is_scored: boolean | null;
  options: OptionRow[] | null;
};

type LoadedSubmission = {
  submissionId: string;
  testSlug: string;
  questions: {
    id: string;
    index: number;
    text: string;
    type: 'single' | 'multi' | 'info';
    isScored: boolean;
    options: {
      id: string;
      label: string;
      points: number | null;
      profileCode: string | null;
      frequency: Freq;
    }[];
  }[];
  answers: Record<string, string | string[] | undefined>;
  finished?: boolean;
};

type SubmissionRow = { id: string; test: { slug: string } | null };
type TestIdRow = { id: string };
type AnswerRow = { question_id: string; selected: unknown };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 1) Load submission (NO "finished" column)
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, test:mc_tests(slug)')
    .eq('id', id)
    .maybeSingle<SubmissionRow>();

  if (subErr || !sub || !sub.test) {
    return NextResponse.json({ error: subErr?.message || 'Submission not found' }, { status: 404 });
  }

  // 2) Resolve test_id from slug
  const { data: testRow, error: testErr } = await supabaseAdmin
    .from('mc_tests')
    .select('id')
    .eq('slug', sub.test.slug)
    .maybeSingle<TestIdRow>();

  if (testErr || !testRow) {
    return NextResponse.json({ error: testErr?.message || 'Test not found' }, { status: 404 });
  }

  // 3) Load questions (+ options)
  const { data: qrows } = await supabaseAdmin
    .from('mc_questions')
    .select(
      'id, index, text, type, is_scored, options:mc_options(id,label,points,profile_code,frequency)'
    )
    .eq('test_id', testRow.id)
    .order('index', { ascending: true });

  const questions: LoadedSubmission['questions'] = ((qrows ?? []) as QuestionRow[]).map((q) => ({
    id: q.id,
    index: q.index,
    text: q.text,
    type: q.type,
    isScored: Boolean(q.is_scored),
    options: (q.options ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      points: o.points ?? null,
      profileCode: o.profile_code ?? null,
      frequency: o.frequency ?? null,
    })),
  }));

  // 4) Load answers
  const { data: arows } = await supabaseAdmin
    .from('mc_answers')
    .select('question_id, selected')
    .eq('submission_id', sub.id);

  const answers: LoadedSubmission['answers'] = {};
  for (const a of (arows ?? []) as AnswerRow[]) {
    const key = String(a.question_id);
    const sel = a.selected;
    answers[key] = Array.isArray(sel)
      ? (sel as ReadonlyArray<unknown>).map((x) => String(x))
      : typeof sel === 'string'
        ? sel
        : undefined;
  }

  const payload: LoadedSubmission = {
    submissionId: sub.id,
    testSlug: sub.test.slug,
    questions,
    answers,
    finished: false, // we don't track it in your schema
  };

  return NextResponse.json(payload);
}
