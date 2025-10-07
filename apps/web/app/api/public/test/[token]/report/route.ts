import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
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

  const { data: test } = await a.from('tests').select('org_id,name').eq('id', link.test_id).maybeSingle();
  if (!test) return NextResponse.json({ ok:false, error:'invalid test' }, { status:404 });

  const { data: org } = await a.from('organizations').select('name').eq('id', test.org_id).maybeSingle();

  // taker & result
  const { data: taker } = await a
    .from('test_takers')
    .select('id, first_name, last_name')
    .eq('id', tid)
    .eq('test_id', link.test_id)
    .maybeSingle();

  if (!taker) return NextResponse.json({ ok:false, error:'invalid taker' }, { status:404 });

  const { data: result } = await a
    .from('test_results')
    .select('freq_scores, profile_key')
    .eq('test_id', link.test_id)
    .eq('taker_id', tid)
    .maybeSingle();

  if (!result) return NextResponse.json({ ok:false, error:'no result' }, { status:404 });

  // pick a profile for the top frequency (first profile with freq_key)
  const topFreq: 'A'|'B'|'C'|'D' = result.profile_key as any;
  const { data: profile } = await a
    .from('profiles')
    .select('key, name, color, description')
    .eq('org_id', test.org_id)
    .eq('freq_key', topFreq)
    .order('key', { ascending: true })
    .limit(1)
    .maybeSingle();

  // template/order + content
  const { data: tmpl } = await a
    .from('report_templates')
    .select('sections_order, name')
    .eq('org_id', test.org_id)
    .maybeSingle();

  const { data: pc } = await a
    .from('profile_content')
    .select('sections')
    .eq('org_id', test.org_id)
    .eq('profile_key', profile?.key || `${topFreq}1`)
    .maybeSingle();

  // defaults
  const sections_order = tmpl?.sections_order ?? ['intro','strengths','challenges','guidance','coaching_prompts','visibility_strategy'];
  const sections = pc?.sections ?? {};

  return NextResponse.json({
    ok: true,
    data: {
      org_name: org?.name ?? 'Your Organization',
      test_name: test.name,
      taker,
      freq_scores: result.freq_scores,
      top_freq: topFreq,
      profile: profile ?? { key: `${topFreq}1`, name: `${topFreq} Profile`, color: '#111111', description: 'Profile description.' },
      sections_order,
      sections
    }
  });
}
