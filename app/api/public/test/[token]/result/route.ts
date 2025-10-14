import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
}

type Scores = { A: number; B: number; C: number; D: number };
function topFreq(s: Scores): 'A'|'B'|'C'|'D' {
  const entries: Array<['A'|'B'|'C'|'D', number]> = [['A',s.A],['B',s.B],['C',s.C],['D',s.D]];
  return entries.sort((a,b)=>b[1]-a[1])[0][0];
}
function deriveExact(s: Scores): { top: 'A'|'B'|'C'|'D', exact: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'|'D1'|'D2' } {
  const t = topFreq(s);
  switch (t) {
    case 'A': return { top: 'A', exact: (s.B >= s.C) ? 'A1' : 'A2' };
    case 'B': return { top: 'B', exact: (s.A >= s.D) ? 'B1' : 'B2' };
    case 'C': return { top: 'C', exact: (s.D >= s.A) ? 'C1' : 'C2' };
    case 'D': return { top: 'D', exact: (s.C >= s.B) ? 'D1' : 'D2' };
  }
}

export async function GET(req: Request, { params }: any) {
  const token = params?.token as string;
  const url = new URL(req.url);
  const tid = url.searchParams.get('tid') || '';
  if (!token || !tid) return NextResponse.json({ ok:false, error:'missing token/tid' }, { status:400 });

  const a = admin();

  // resolve test + org
  const { data: link } = await a.from('test_links').select('test_id').eq('token', token).maybeSingle();
  if (!link) return NextResponse.json({ ok:false, error:'invalid link' }, { status:404 });

  // taker
  const { data: taker } = await a
    .from('test_takers')
    .select('id, first_name, last_name')
    .eq('id', tid).eq('test_id', link.test_id)
    .maybeSingle();
  if (!taker) return NextResponse.json({ ok:false, error:'invalid taker' }, { status:404 });

  // result
  const { data: result } = await a
    .from('test_results')
    .select('id, freq_scores, profile_key, profile_exact_key')
    .eq('test_id', link.test_id)
    .eq('taker_id', tid)
    .maybeSingle();

  if (!result) return NextResponse.json({ ok:false, error:'no result' }, { status:404 });

  const scores = (result.freq_scores || {}) as Scores;
  const derived = deriveExact(scores);

  // backfill profile_exact_key if missing or stale
  if (!result.profile_exact_key || !/^[ABCD][12]$/.test(result.profile_exact_key)) {
    await a.from('test_results')
      .update({ profile_key: derived.top, profile_exact_key: derived.exact })
      .eq('id', result.id);
  }

  return NextResponse.json({
    ok: true,
    data: {
      taker,
      scores,
      profile_key: derived.top,
      profile_exact_key: result.profile_exact_key || derived.exact
    }
  });
}
