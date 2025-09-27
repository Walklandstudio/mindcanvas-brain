// app/api/submissions/[id]/answer/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

interface Body {
  questionId: string;
  optionId?: string;    // for single-choice
  value?: string | number | boolean | null; // for text/scale if needed
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await ctx.params;

  let body: Body | null = null;
  try { body = (await req.json()) as Body; } catch { /* noop */ }

  const questionId = body?.questionId ?? '';
  const optionId = body?.optionId ?? null;
  const value = typeof body?.value === 'undefined' ? null : body?.value;

  if (!submissionId || !questionId) {
    return NextResponse.json({ error: 'Missing submissionId or questionId' }, { status: 400 });
  }

  // Verify question exists
  const { data: q, error: qErr } = await supabase
    .from('mc_questions')
    .select('id, test_id')
    .eq('id', questionId)
    .maybeSingle();
  if (qErr || !q) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  // If optionId provided, verify it belongs to the question
  if (optionId) {
    const { data: opt, error: oErr } = await supabase
      .from('mc_options')
      .select('id, question_id')
      .eq('id', optionId)
      .maybeSingle();
    if (oErr || !opt || opt.question_id !== questionId) {
      return NextResponse.json({ error: 'Option not valid for question' }, { status: 400 });
    }
  }

  // Ensure submission exists
  const { data: sub, error: sErr } = await supabase
    .from('mc_submissions')
    .select('id')
    .eq('id', submissionId)
    .maybeSingle();
  if (sErr || !sub) {
    // create a placeholder submission (optional)
    const { data: created, error: cErr } = await supabase
      .from('mc_submissions').insert({ id: submissionId }).select('id').single();
    if (cErr || !created) {
      return NextResponse.json({ error: 'Submission not found and could not be created' }, { status: 400 });
    }
  }

  // Upsert answer (one answer per (submission, question))
  // Strategy: delete existing then insert to keep it simple and deterministic
  const { error: delErr } = await supabase
    .from('mc_answers')
    .delete()
    .eq('submission_id', submissionId)
    .eq('question_id', questionId);
  if (delErr) {
    return NextResponse.json({ error: `Failed to clear previous answer: ${delErr.message}` }, { status: 500 });
  }

  const insertPayload = {
    submission_id: submissionId,
    question_id: questionId,
    option_id: optionId,
    value,
  };
  const { error: insErr } = await supabase.from('mc_answers').insert(insertPayload);
  if (insErr) {
    return NextResponse.json({ error: `Failed to save answer: ${insErr.message}` }, { status: 500 });
  }

  // Progress: count answered questions for this submission
  const { data: progressRows, error: pErr } = await supabase
    .from('mc_answers')
    .select('question_id', { count: 'exact', head: true })
    .eq('submission_id', submissionId);
  const answered = pErr ? 0 : (progressRows as unknown as { count: number } | null)?.count ?? 0;

  return NextResponse.json({ ok: true, answered }, { status: 200 });
}

