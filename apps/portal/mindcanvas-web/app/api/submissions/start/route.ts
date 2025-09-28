import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Freq = 'A' | 'B' | 'C' | 'D' | null;

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

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = body?.slug?.trim();
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  // 1) test
  const { data: test, error: tErr } = await supabaseAdmin
    .from('mc_tests')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle<{ id: string; slug: string }>();

  if (tErr || !test) {
    return NextResponse.json({ error: tErr?.message || 'Test not found' }, { status: 404 });
  }

  // 2) create submission
  const { data: sub, error: sErr } = await supabaseAdmin
    .from('mc_submissions')
    .insert({ test_id: test.id })
    .select('id')
    .single<{ id: string }>();

  if (sErr || !sub) {
    return NextResponse.json({ error: sErr?.message || 'Failed to create submission' }, { status: 500 });
  }

  // 3) questions
  const { data: qrows, error: qErr } = await supabaseAdmin
    .from('mc_questions')
    .select('id, index:order_index, text, type, is_scored')
    .eq('test_id', test.id)
    .order('order_index', { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const questionsRaw = (qrows ?? []) as QuestionRow[];
  const qIds = questionsRaw.map(q => q.id);

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

  // 5) assemble
  const questions: LoadedSubmission['questions'] = questionsRaw.map(q => ({
    id: q.id,
    index: Number(q.index ?? 0),
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

  const payload: LoadedSubmission = {
    submissionId: sub.id,
    testSlug: test.slug,
    questions,
    answers: {},
    finished: false,
  };

  return NextResponse.json(payload);
}
