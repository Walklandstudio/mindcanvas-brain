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

export async function PATCH(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok: false, error: 'missing bearer' }, { status: 401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok: false, error: 'no org' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: any = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.color === 'string') patch.color = body.color.trim();
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.freq_key === 'string' && ['A','B','C','D'].includes(body.freq_key)) {
    patch.freq_key = body.freq_key;
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok:false, error:'nothing to update' }, { status:400 });

  const a = admin();
  const { error } = await a.from('profiles').update(patch).eq('id', params.id).eq('org_id', orgId);
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
