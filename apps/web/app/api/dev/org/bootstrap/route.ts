// apps/web/app/api/dev/org/bootstrap/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

export async function POST() {
  const sb = svc();

  // Ensure demo org exists. Adjust table/columns if your schema differs.
  // If your organizations table has more required columns, set defaults here.
  const up = await sb
    .from('organizations')
    .upsert(
      [{ id: DEMO_ORG_ID, name: 'Demo Org' }],
      { onConflict: 'id', ignoreDuplicates: false }
    )
    .select('id')
    .maybeSingle();

  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  // Set cookie for the app to read
  const res = NextResponse.json({ ok: true, orgId: DEMO_ORG_ID });
  res.cookies.set('mc_org_id', DEMO_ORG_ID, {
    httpOnly: false,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
