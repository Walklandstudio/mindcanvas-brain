import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
}
function userClient(bearer: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: bearer } }
  });
}
async function getOrgId(bearer: string) {
  const u = userClient(bearer);
  const { data } = await u.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return null;
  const a = admin();
  const { data: m } = await a.from('org_memberships').select('org_id').eq('user_id', uid).limit(1);
  return m?.[0]?.org_id ?? null;
}

export async function POST(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const url = new URL(req.url);
  const testId = url.searchParams.get('testId') || '';
  const mode = (url.searchParams.get('mode') || 'append').toLowerCase() as 'append'|'replace';

  if (!testId) return NextResponse.json({ ok:false, error:'missing testId' }, { status:400 });

  const a = admin();

  // Verify test belongs to org
  const { data: test } = await a.from('tests').select('id, org_id').eq('id', testId).maybeSingle();
  if (!test || test.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  // Find template
  const key = params?.key as string;
  const { data: t } = await a.from('templates').select('id').eq('key', key).maybeSingle();
  if (!t) return NextResponse.json({ ok:false, error:'template not found' }, { status:404 });

  // Optional replace: clear current questions
  if (mode === 'replace') {
    await a.from('test_questions').delete().eq('test_id', testId);
  }

  // Compute next order start
  const { data: max } = await a.from('test_questions').select('order').eq('test_id', testId).order('order', { ascending: false }).limit(1);
  let baseOrder = (max?.[0]?.order ?? 0);

  // Copy questions
  const { data: qs } = await a
    .from('template_questions')
    .select('type, text, scoring, visible_in_free, order')
    .eq('template_id', t.id)
    .order('order', { ascending: true });

  if (qs?.length) {
    const rows = qs.map((q: any, i: number) => ({
      test_id: testId,
      type: q.type,
      text: q.text,
      scoring: q.scoring || {},
      visible_in_free: !!q.visible_in_free,
      order: baseOrder + i + 1
    }));
    const ins = await a.from('test_questions').insert(rows);
    if (ins.error) return NextResponse.json({ ok:false, error: ins.error.message }, { status:500 });
  }

  // Seed profiles for org if not present
  const { data: hasProfile } = await a.from('profiles').select('id').eq('org_id', orgId).limit(1);
  if (!hasProfile?.length) {
    const { data: tpid } = await a.from('template_profiles').select('key,freq_key,name,color,description').eq('template_id', t.id);
    if (tpid?.length) {
      await a.from('profiles').insert(tpid.map((p: any) => ({ org_id: orgId, ...p })));
    }
  }

  // Upsert profile content (only if not present)
  const { data: pc } = await a.from('template_profile_content').select('profile_key, sections').eq('template_id', t.id);
  if (pc?.length) {
    for (const row of pc) {
      await a.from('profile_content').upsert({ org_id: orgId, profile_key: row.profile_key, sections: row.sections });
    }
  }

  // Upsert report template order if org doesn’t have one
  const { data: orgTmpl } = await a.from('report_templates').select('org_id').eq('org_id', orgId).maybeSingle();
  if (!orgTmpl) {
    const { data: tt } = await a.from('template_report_templates').select('sections_order').eq('template_id', t.id).maybeSingle();
    await a.from('report_templates').upsert({ org_id: orgId, sections_order: tt?.sections_order ?? ['intro','strengths','challenges','guidance','coaching_prompts','visibility_strategy'] });
  }

  return NextResponse.json({ ok:true, applied: key, mode, added_questions: qs?.length ?? 0 });
}
