import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const { question_idx, option_idx } = await req.json();

  if (!question_idx || !option_idx) {
    return NextResponse.json({ error: 'question_idx and option_idx required' }, { status: 400 });
  }

  const { data: sub, error: sErr } = await supabase
    .from('mc_submissions').select('test_id').eq('id', id).single();
  if (sErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

  const { data: q, error: qErr } = await supabase
    .from('mc_questions').select('id').eq('test_id', sub.test_id).eq('idx', question_idx).single();
  if (qErr || !q) return NextResponse.json({ error: 'Invalid question_idx' }, { status: 400 });

  const { data: opt, error: oErr } = await supabase
    .from('mc_options').select('id').eq('question_id', q.id).eq('idx', option_idx).single();
  if (oErr || !opt) return NextResponse.json({ error: 'Invalid option_idx' }, { status: 400 });

  const { error: aErr } = await supabase
    .from('mc_answers')
    .upsert([{ submission_id: id, question_id: q.id, option_id: opt.id }], { onConflict: 'submission_id,question_id' });

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
