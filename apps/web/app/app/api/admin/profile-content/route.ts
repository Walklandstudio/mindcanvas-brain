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

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const a = admin();
  const [pc, tmpl] = await Promise.all([
    a.from('profile_content').select('profile_key, sections').eq('org_id', orgId),
    a.from('report_templates').select('sections_order, name').eq('org_id', orgId).maybeSingle()
  ]);

  return NextResponse.json({ ok:true, data: { contents: pc.data ?? [], template: tmpl.data ?? { sections_order: null, name: 'Default' } }});
}

export async function PATCH(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const body = await req.json().catch(() => ({}));
  const profile_key: string | undefined = body?.profile_key;
  const sections = body?.sections;

  if (!profile_key || typeof sections !== 'object') {
    return NextResponse.json({ ok:false, error:'profile_key & sections required' }, { status:400 });
  }

  const a = admin();
  const { error } = await a.from('profile_content').upsert({
    org_id: orgId, profile_key, sections, updated_at: new Date().toISOString()
  });
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}

export async function POST(req: Request) {
  // update template sections order
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const body = await req.json().catch(() => ({}));
  const sections_order: string[] | undefined = body?.sections_order;
  const name: string | undefined = body?.name;

  if (!Array.isArray(sections_order) || sections_order.length === 0) {
    return NextResponse.json({ ok:false, error:'sections_order required' }, { status:400 });
  }

  const a = admin();
  const { error } = await a.from('report_templates').upsert({ org_id: orgId, sections_order, name: name ?? 'Default' });
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
