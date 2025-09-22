import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const { pairs } = await req.json(); // [{q:number,o:number},...]

  if (!Array.isArray(pairs) || !pairs.length) {
    return NextResponse.json({ error: 'pairs required' }, { status: 400 });
  }

  const { data: sub, error: sErr } = await supabase
    .from('mc_submissions').select('test_id').eq('id', id).single();
  if (sErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

  const { data: questions } = await supabase
    .from('mc_questions').select('id, idx').eq('test_id', sub.test_id);

  const qByIdx = new Map<number, string>(questions?.map(r => [r.idx as number, r.id as string]));

  const rows: any[] = [];
  for (const p of pairs) {
    const qid = qByIdx.get(p.q);
    if (!qid) continue;
    const { data: opt } = await supabase
      .from('mc_options').select('id').eq('question_id', qid).eq('idx', p.o).single();
    if (opt) rows.push({ submission_id: id, question_id: qid, option_id: opt.id });
  }
  if (!rows.length) return NextResponse.json({ error: 'No valid pairs' }, { status: 400 });

  const { error: aErr } = await supabase.from('mc_answers')
    .upsert(rows, { onConflict: 'submission_id,question_id' });

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: rows.length });
}
