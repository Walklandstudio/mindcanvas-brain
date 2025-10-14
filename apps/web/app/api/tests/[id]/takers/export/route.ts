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

function csvEscape(s: string): string {
  if (s == null) return '';
  const needs = /[",\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needs ? `"${esc}"` : esc;
}

export async function GET(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const a = admin();
  const { data: t } = await a.from('tests').select('org_id,name').eq('id', params.id).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  const { data, error } = await a
    .from('test_takers')
    .select('id, first_name, last_name, email, phone, company, team, team_function, created_at, test_results(profile_key, profile_exact_key, freq_scores)')
    .eq('test_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  const rows = (data || []).map((r: any) => {
    const rel = Array.isArray(r.test_results) ? r.test_results[0] : r.test_results;
    const freq = rel?.freq_scores || {};
    return {
      id: r.id,
      first_name: r.first_name ?? '',
      last_name: r.last_name ?? '',
      email: r.email ?? '',
      phone: r.phone ?? '',
      company: r.company ?? '',
      team: r.team ?? '',
      team_function: r.team_function ?? '',
      created_at: r.created_at,
      profile_key: rel?.profile_exact_key ?? rel?.profile_key ?? '',
      A: freq.A ?? '',
      B: freq.B ?? '',
      C: freq.C ?? '',
      D: freq.D ?? ''
    };
  });

  const headers = ['taker_id','first_name','last_name','email','phone','company','team','team_function','created_at','profile_key','A','B','C','D'];
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => csvEscape(String((r as any)[h] ?? ''))).join(',')),
  ].join('\n');

  const fname = `takers-${(t.name || 'test').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.csv`;

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${fname}"`
    }
  });
}
