import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}
function userClient(bearer: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: bearer } } }
  );
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

export async function GET(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const a = admin();
  const { data: t } = await a.from('tests').select('org_id').eq('id', params.id).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  const { data, error } = await a
    .from('test_questions')
    .select('id, text, type, "order", scoring, visible_in_free')
    .eq('test_id', params.id)
    .order('order', { ascending: true });

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, data });
}

export async function POST(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const a = admin();
  const { data: t } = await a.from('tests').select('org_id').eq('id', params.id).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  const body = await req.json().catch(() => ({}));
  const text = (body?.text || '').toString().trim();
  if (!text) return NextResponse.json({ ok:false, error:'text required' }, { status:400 });

  const { data: max } = await a
    .from('test_questions')
    .select('order')
    .eq('test_id', params.id)
    .order('order', { ascending:false })
    .limit(1);
  const nextOrder = (max?.[0]?.order ?? 0) + 1;

  const { data, error } = await a
    .from('test_questions')
    .insert({ test_id: params.id, text, type: 'text', order: nextOrder, visible_in_free: false })
    .select('id, text, type, "order", scoring, visible_in_free')
    .single();

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, data });
}

export async function PATCH(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const a = admin();
  const { data: t } = await a.from('tests').select('org_id').eq('id', params.id).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  const body = await req.json().catch(() => ({}));
  const arr: string[] = Array.isArray(body?.order) ? body.order : [];
  if (!arr.length) return NextResponse.json({ ok:false, error:'order required' }, { status:400 });

  for (let i = 0; i < arr.length; i++) {
    await a.from('test_questions').update({ order: i + 1 }).eq('id', arr[i]).eq('test_id', params.id);
  }
  return NextResponse.json({ ok:true });
}
