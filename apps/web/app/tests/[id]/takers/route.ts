import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
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
  // verify test belongs to org
  const { data: t } = await a.from('tests').select('org_id').eq('id', params.id).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  const { data, error } = await a
    .from('test_takers')
    .select('id, first_name, last_name, email, phone, company, team, team_function, created_at, test_results(profile_key)')
    .eq('test_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  // flatten profile_key
  const rows = (data || []).map((r: any) => ({
    id: r.id,
    first_name: r.first_name ?? '',
    last_name: r.last_name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    company: r.company ?? '',
    team: r.team ?? '',
    team_function: r.team_function ?? '',
    created_at: r.created_at,
    profile_key: Array.isArray(r.test_results) ? (r.test_results[0]?.profile_key ?? '') : (r.test_results?.profile_key ?? '')
  }));

  return NextResponse.json({ ok:true, data: rows });
}
