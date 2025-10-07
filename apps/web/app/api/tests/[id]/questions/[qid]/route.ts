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

export async function PATCH(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok:false, error:'no org' }, { status:401 });

  const a = admin();

  // verify test belongs to org
  const { data: t } = await a.from('tests').select('org_id').eq('id', params.id).maybeSingle();
  if (!t || t.org_id !== orgId) return NextResponse.json({ ok:false, error:'forbidden' }, { status:403 });

  const body = await req.json().catch(() => ({}));
  const patch: any = {};
  if (typeof body.text === 'string') patch.text = body.text.trim();
  if (body.type && (body.type === 'text' || body.type === 'scale5')) patch.type = body.type;
  if (body.scoring && typeof body.scoring === 'object') patch.scoring = body.scoring;

  if (!Object.keys(patch).length) return NextResponse.json({ ok:false, error:'nothing to update' }, { status:400 });

  const { data, error } = await a
    .from('test_questions')
    .update(patch)
    .eq('id', params.qid)
    .eq('test_id', params.id)
    .select('id, text, type, "order", scoring')
    .single();

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, data });
}
