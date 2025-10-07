import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
async function getUserId(bearer: string) {
  const u = userClient(bearer);
  const { data } = await u.auth.getUser();
  return data.user?.id ?? null;
}
function makeToken(len = 10) {
  // url-safe base64-ish
  return crypto.randomBytes(12).toString('base64url').slice(0, len);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'missing bearer' }, { status:401 });

  const a = admin();
  // sanity: ensure test exists (and implies org)
  const { data: test, error: terr } = await a.from('tests').select('id').eq('id', params.id).single();
  if (terr || !test) return NextResponse.json({ ok:false, error:'test not found' }, { status:404 });

  const userId = await getUserId(auth);
  const token = makeToken(12);

  const { data: link, error } = await a
    .from('test_links')
    .insert({ test_id: params.id, token, created_by: userId ?? undefined })
    .select('token')
    .single();

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  return NextResponse.json({ ok:true, token: link.token });
}
