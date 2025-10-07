import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

export async function GET(req: Request, { params }: any) {
  const token = params?.token as string;
  const url = new URL(req.url);
  const tid = url.searchParams.get('tid') || '';
  if (!token || !tid) return NextResponse.json({ ok:false, error:'missing token/tid' }, { status:400 });

  const a = admin();
  const { data: link } = await a.from('test_links').select('test_id').eq('token', token).maybeSingle();
  if (!link) return NextResponse.json({ ok:false, error:'invalid link' }, { status:404 });

  const { data: taker } = await a
    .from('test_takers')
    .select('id, first_name, last_name')
    .eq('id', tid)
    .eq('test_id', link.test_id)
    .maybeSingle();
  if (!taker) return NextResponse.json({ ok:false, error:'invalid taker' }, { status:404 });

  const { data: res } = await a
    .from('test_results')
    .select('freq_scores, profile_key')
    .eq('test_id', link.test_id)
    .eq('taker_id', tid)
    .maybeSingle();

  if (!res) return NextResponse.json({ ok:false, error:'no result' }, { status:404 });

  return NextResponse.json({ ok:true, data: { taker, scores: res.freq_scores, profile_key: res.profile_key }});
}
