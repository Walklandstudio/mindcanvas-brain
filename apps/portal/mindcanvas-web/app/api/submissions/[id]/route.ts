import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Freq = 'A' | 'B' | 'C' | 'D' | null;

type SubmissionRow = { id: string; test_id: string | null };
type TestRow = { slug: string };
type QuestionRow = {
  id: string;
  index: number | null; // aliased from order_index
  text: string;
  type: 'single' | 'multi' | 'info';
  is_scored: boolean | null;
};
type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  points: number | null;
  profile_code: string | null;
  frequency: Freq;
};
type AnswerRow = { question_id: string; selected: unknown };

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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 1) submission (id + test_id)
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, test_id')
    .eq('id', id)
    .maybeSingle<SubmissionRow>();

  if (subErr || !sub || !sub.test_id) {
    return NextResponse.json(
      { error: subErr?.message || 'Submission not found or missing test_id' },
      { status: 404 },
    );
  }

  const testId = sub.test_id;

  // 2) slug
  let testSlug = 'test';
  {
    const { data: trow } = await supabaseAdmin
      .from('mc_tests')
      .select('slug')
      .eq('id', testId)
      .maybeSingle<TestRow>();
    if (trow?.slug) testSlug = trow.slug;
  }

  // 3) questions (alias order_index → index)
  const { data: qrows, error: qErr } = await supabaseAdmin
    .from('mc_questions')
    .select('id, index:order_index, text, type, is_scored')
    .eq('test_id', testId)
    .order('order_index', { ascending: true });
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const questionsRaw = (qrows ?? []) as QuestionRow[];
  const qIds = questionsRaw.map((q) => q.id);

  // 4) options
  const optionsByQ: Record<string, OptionRow[]> = {};
  if (qIds.length) {
    const { data: orows, error: oErr } = await supabaseAdmin
      .from('mc_options')
      .select('id, question_id, label, points, profile_code, frequency')
      .in('question_id', qIds);
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
    for (const o of (orows ?? []) as OptionRow[]) {
      (optionsByQ[o.question_id] ||= []).push(o);
    }
  }

  // 5) answers
  const { data: arows, error: aErr } = await supabaseAdmin
    .from('mc_answers')
    .select('question_id, selected')
    .eq('submission_id', sub.id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

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

  // 6) shape
  const questions: LoadedSubmission['questions'] = questionsRaw.map((q) => ({
    id: q.id,
    index: Number(q.index ?? 0),
    text: q.text,
    type: q.type,
    isScored: Boolean(q.is_scored),
    options: (optionsByQ[q.id] ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      points: o.points ?? null,
      profileCode: o.profile_code ?? null,
      frequency: o.frequency ?? null,
    })),
  }));

  return NextResponse.json({
    submissionId: sub.id,
    testSlug,
    questions,
    answers,
    finished: false,
  } as LoadedSubmission);
}
