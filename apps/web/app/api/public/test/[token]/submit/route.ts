import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

export async function POST(req: Request, { params }: any) {
  const token = params?.token as string;
  if (!token) return NextResponse.json({ ok:false, error:'missing token' }, { status:400 });

  const body = await req.json().catch(() => ({}));
  const taker_id: string | undefined = body?.taker_id;
  const answers: Array<{ question_id: string; value: string }> = body?.answers || [];

  if (!taker_id) return NextResponse.json({ ok:false, error:'missing taker_id' }, { status:400 });
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ ok:false, error:'answers required' }, { status:400 });
  }

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

  const rows = answers.map(aRow => ({
    test_id: link.test_id,
    taker_id,
    question_id: aRow.question_id,
    answer_text: (aRow.value ?? '').toString()
  }));

  const { error } = await a.from('test_answers').insert(rows);
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  return NextResponse.json({ ok:true });
}
