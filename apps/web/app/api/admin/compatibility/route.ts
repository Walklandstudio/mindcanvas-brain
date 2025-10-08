import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
}
function userClient(bearer: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: bearer } } });
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
function canon(a: string, b: string): [string,string] {
  return a <= b ? [a,b] : [b,a];
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const a = admin();

  const { data: profiles } = await a
    .from('profiles')
    .select('key, name')
    .eq('org_id', orgId)
    .order('key', { ascending: true });

  const { data: pairs } = await a
    .from('profile_compat')
    .select('a_key,b_key,score')
    .eq('org_id', orgId);

  return NextResponse.json({ ok:true, data: { profiles: profiles || [], pairs: pairs || [] } });
}

export async function PATCH(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const body = await req.json().catch(()=>({}));
  const updates: Array<{a_key:string;b_key:string;score:number}> = Array.isArray(body?.updates) ? body.updates : [];
  if (!updates.length) return NextResponse.json({ ok:false, error:'no updates' }, { status:400 });

  const a = admin();

  for (const row of updates) {
    if (!/^[ABCD][12]$/.test(row.a_key) || !/^[ABCD][12]$/.test(row.b_key)) continue;
    const [ak,bk] = canon(row.a_key, row.b_key);
    await a.from('profile_compat').upsert({
      org_id: orgId, a_key: ak, b_key: bk, score: Number(row.score) || 0, updated_at: new Date().toISOString()
    });
  }

  return NextResponse.json({ ok:true });
}
