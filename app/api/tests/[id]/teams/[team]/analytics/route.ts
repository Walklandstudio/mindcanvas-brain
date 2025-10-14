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
function canon(a: string, b: string): [string,string] { return a <= b ? [a,b] : [b,a]; }

export async function GET(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const testId = params.id as string;
  // [team] is URI component-encoded by Next
  const teamRaw = params.team as string;
  const team = decodeURIComponent(teamRaw);

  const a = admin();

  // authorize test/org
  const { data: t } = await a.from('tests').select('org_id,name').eq('id', testId).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  // load team members + results
  const { data: members, error: terr } = await a
    .from('test_takers')
    .select('id, first_name, last_name, email, team, team_function, test_results(profile_key, profile_exact_key, freq_scores)')
    .eq('test_id', testId).eq('team', team);

  if (terr) return NextResponse.json({ ok:false, error: terr.message }, { status:500 });

  const profs = (members || []).map((m: any) => {
    const rel = Array.isArray(m.test_results) ? m.test_results[0] : m.test_results;
    const ek = rel?.profile_exact_key || rel?.profile_key || '';
    return { id: m.id, name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(), exact: ek };
  }).filter(x => /^[ABCD][12]$/.test(x.exact));

  // load compatibility pairs for org
  const { data: pairs } = await a.from('profile_compat').select('a_key,b_key,score').eq('org_id', orgId);
  const compat = new Map<string, number>();
  for (const p of pairs || []) compat.set(`${p.a_key}|${p.b_key}`, p.score);

  // build matrix and average score
  const keys = ['A1','A2','B1','B2','C1','C2','D1','D2'];
  const matrix: Record<string, Record<string, number | null>> = {};
  for (const r of keys) { matrix[r] = {}; for (const c of keys) matrix[r][c] = (r === c) ? null : 0; }

  let sum = 0, n = 0;
  for (let i = 0; i < profs.length; i++) {
    for (let j = i + 1; j < profs.length; j++) {
      const [ak, bk] = canon(profs[i].exact, profs[j].exact);
      const key = `${ak}|${bk}`;
      const score = compat.get(key) ?? 0;
      matrix[profs[i].exact][profs[j].exact] = score;
      matrix[profs[j].exact][profs[i].exact] = score;
      sum += score; n += 1;
    }
  }
  const team_score = n ? +(sum / n).toFixed(2) : 0;

  // quick counts per frequency
  const counts: Record<'A'|'B'|'C'|'D', number> = { A:0,B:0,C:0,D:0 };
  for (const p of profs) counts[p.exact[0] as 'A'|'B'|'C'|'D']++;

  return NextResponse.json({
    ok: true,
    data: {
      test_name: t?.name ?? 'Test',
      team,
      members: profs,         // { id, name, exact }
      matrix,                 // 8x8 numeric (null on diagonal)
      team_score,             // average pairwise compat
      counts                  // A/B/C/D counts
    }
  });
}
