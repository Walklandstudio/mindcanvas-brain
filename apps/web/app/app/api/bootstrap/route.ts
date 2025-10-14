import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // 1) Verify caller via their Supabase JWT from Authorization header
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'missing bearer token' }, { status: 401 });
  }
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const user = userData.user;

  // 2) Admin client with service role
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // server-only
  );

  // 3) Do we already have a membership?
  const { data: existing, error: mErr } = await admin
    .from('org_memberships')
    .select('org_id').eq('user_id', user.id).limit(1);
  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });

  let orgId = existing?.[0]?.org_id as string | undefined;

  // 4) If not, create org + membership
  if (!orgId) {
    const email = user.email ?? 'user';
    const slugBase = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const name = `${slugBase}'s Org`;

    const { data: org, error: oErr } = await admin
      .from('organizations')
      .insert({ name, slug })
      .select('id').single();
    if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });

    orgId = org.id;

    const { error: jErr } = await admin
      .from('org_memberships')
      .insert({ org_id: orgId, user_id: user.id, role: 'owner' });
    if (jErr) return NextResponse.json({ ok: false, error: jErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, org_id: orgId });
}
