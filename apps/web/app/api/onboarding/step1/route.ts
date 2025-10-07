import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // server-only
  );
}

function userClient(bearer: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: bearer } } }
  );
}

// Helper: from a user token, get their first org_id
async function getOrgId(bearer: string) {
  const u = userClient(bearer);
  const { data: ures } = await u.auth.getUser();
  const uid = ures?.user?.id;
  if (!uid) return null;

  const a = admin();
  const { data: m } = await a
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', uid)
    .limit(1);
  return m?.[0]?.org_id ?? null;
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'missing bearer token' }, { status: 401 });
  }
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok: false, error: 'no org' }, { status: 401 });

  const a = admin();
  const { data, error } = await a
    .from('org_profiles')
    .select('*')
    .eq('org_id', orgId)
    .single();
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: data ?? null });
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'missing bearer token' }, { status: 401 });
  }
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok: false, error: 'no org' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    company_name,
    first_name,
    last_name,
    position,
    contact_email,
    phone_country,
    phone_number
  } = body ?? {};

  if (!company_name || !first_name || !last_name || !contact_email) {
    return NextResponse.json({ ok: false, error: 'missing required fields' }, { status: 400 });
  }

  const a = admin();
  const { error } = await a
    .from('org_profiles')
    .upsert({
      org_id: orgId,
      company_name,
      first_name,
      last_name,
      position: position ?? null,
      contact_email,
      phone_country: phone_country ?? null,
      phone_number: phone_number ?? null,
      updated_at: new Date().toISOString()
    });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
