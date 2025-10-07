import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

type AnswerIn = { question_id: string; value: string };

export async function POST(req: Request, { params }: any) {
  const token = params?.token as string;
  if (!token) return NextResponse.json({ ok:false, error:'missing token' }, { status:400 });

  const body = await req.json().catch(() => ({}));
  const taker_id: string | undefined = body?.taker_id;
  const answers: AnswerIn[] = Array.isArray(body?.answers) ? body.answers : [];

  if (!taker_id) return NextResponse.json({ ok:false, error:'missing taker_id' }, { status:400 });
  if (!answers.length) return NextResponse.json({ ok:false, error:'answers required' }, { status:400 });

  const a = admin();

  // resolve link/test + validate taker belongs to that test
  const { data: link } = await a.from('test_links').select('test_id, token').eq('token', token).maybeSingle();
  if (!link) return NextResponse.json({ ok:false, error:'invalid link' }, { status:404 });

  const { data: taker } = await a
    .from('test_takers')
    .select('id')
    .eq('id', taker_id)
    .eq('test_id', link.test_id)
    .maybeSingle();
  if (!taker) return NextResponse.json({ ok:false, error:'invalid taker' }, { status:400 });

  // insert raw answers
  const rows = answers.map(aRow => ({
    test_id: link.test_id,
    taker_id,
    question_id: aRow.question_id,
    answer_text: (aRow.value ?? '').toString()
  }));
  const ins = await a.from('test_answers').insert(rows);
  if (ins.error) return NextResponse.json({ ok:false, error: ins.error.message }, { status:500 });

  // fetch questions with scoring
  const { data: qs, error: qerr } = await a
    .from('test_questions')
    .select('id, type, scoring')
    .eq('test_id', link.test_id);
  if (qerr) return NextResponse.json({ ok:false, error:qerr.message }, { status:500 });

  const answerMap = new Map<string, string>();
  for (const r of rows) answerMap.set(r.question_id, r.answer_text);

  // compute freq scores
  const scores: Record<'A'|'B'|'C'|'D', number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const q of qs || []) {
    const raw = answerMap.get(q.id);
    if (!raw) continue;

    if (q.type === 'scale5') {
      const v = Math.max(1, Math.min(5, parseInt(raw, 10) || 0));
      const delta = v - 3; // -2..+2
      const s = (q.scoring || {}) as Record<string, number>;
      scores.A += delta * (Number(s.A) || 0);
      scores.B += delta * (Number(s.B) || 0);
      scores.C += delta * (Number(s.C) || 0);
      scores.D += delta * (Number(s.D) || 0);
    }
    // 'text' → no effect for now
  }

  // choose top profile_key
  const entries: Array<['A'|'B'|'C'|'D', number]> = [
    ['A', scores.A], ['B', scores.B], ['C', scores.C], ['D', scores.D]
  ];
  entries.sort((a,b) => b[1] - a[1]);
  const top = entries[0][0];

  // save result
  const { error: rerr } = await a.from('test_results').insert({
    test_id: link.test_id,
    taker_id,
    freq_scores: scores as any,
    profile_key: top
  });
  if (rerr) return NextResponse.json({ ok:false, error:rerr.message }, { status:500 });

  return NextResponse.json({ ok:true, scores, profile_key: top });
}
