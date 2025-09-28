import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Freq = 'A' | 'B' | 'C' | 'D' | null;

type SubmissionRow = { id: string; test_id: string | null };
type TestRow = { slug: string };

// We make question row tolerant to different column names
type QuestionRow = {
  id: string;
  text: string;
  type: 'single' | 'multi' | 'info';
  is_scored: boolean | null;
  order_index?: number | null;
  index?: number | null;
  position?: number | null;
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

function ord(q: QuestionRow): number {
  const cands = [q.order_index, q.index, q.position].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  return cands.length ? cands[0]! : 0;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 1) submission (id + test_id)
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, test_id')
    .eq('id', id)
    .maybeSingle<SubmissionRow>();
  if (subErr || !sub?.test_id) {
    return NextResponse.json(
      { error: subErr?.message || 'Submission not found or missing test_id' },
      { status: 404 },
    );
  }
  const testId = sub.test_id;

  // 2) slug
  let testSlug = 'test';
  const { data: trow } = await supabaseAdmin
    .from('mc_tests')
    .select('slug')
    .eq('id', testId)
    .maybeSingle<TestRow>();
  if (trow?.slug) testSlug = trow.slug;

  // 3) questions (don’t rely on a specific order column)
  const { data: qrows, error: qErr } = await supabaseAdmin
    .from('mc_questions')
    .select('id, text, type, is_scored, order_index, index, position')
    .eq('test_id', testId);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const questionsRaw = (qrows ?? []) as QuestionRow[];
  // Stable sort using whichever column exists, then by id to avoid ties
  questionsRaw.sort((a, b) => ord(a) - ord(b) || a.id.localeCompare(b.id));
  const qIds = questionsRaw.map(q => q.id);

  // 4) options (no fragile ordering)
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
    // gentle option sort by label to keep things deterministic
    for (const k of Object.keys(optionsByQ)) {
      optionsByQ[k].sort((a, b) => a.label.localeCompare(b.label));
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
      ? (sel as ReadonlyArray<unknown>).map(x => String(x))
      : typeof sel === 'string'
        ? sel
        : undefined;
  }

  // 6) shape
  const questions: LoadedSubmission['questions'] = questionsRaw.map((q, i) => ({
    id: q.id,
    index: (Number.isFinite(ord(q)) ? ord(q) : i + 1) as number,
    text: q.text,
    type: q.type,
    isScored: Boolean(q.is_scored),
    options: (optionsByQ[q.id] ?? []).map(o => ({
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
  } satisfies LoadedSubmission);
}
