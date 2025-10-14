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

  // Authorize test belongs to org
  const { data: t } = await a.from('tests').select('org_id').eq('id', params.id).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  const { data: rows, error } = await a
    .from('test_takers')
    .select('team, id, test_results(profile_key, profile_exact_key)')
    .eq('test_id', params.id);

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  const teams: Record<string, { name: string; count: number; profiles: Record<string, number> }> = {};
  for (const r of rows || []) {
    const team = (r.team || 'Unassigned').trim();
    const rel = Array.isArray(r.test_results) ? r.test_results[0] : r.test_results;
    const prof = rel?.profile_exact_key || rel?.profile_key || '';
    if (!teams[team]) teams[team] = { name: team, count: 0, profiles: {} };
    teams[team].count += 1;
    if (prof) teams[team].profiles[prof] = (teams[team].profiles[prof] || 0) + 1;
  }

  const list = Object.values(teams).sort((a,b) => b.count - a.count);
  return NextResponse.json({ ok:true, data: list });
}
