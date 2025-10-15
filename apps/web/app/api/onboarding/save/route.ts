import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

async function getOrgId() {
  const c = await cookies();
  return c.get('mc_org_id')?.value ?? '00000000-0000-0000-0000-000000000001';
}

export async function GET(req: Request) {
  const step = new URL(req.url).searchParams.get('step') || 'company';
  const orgId = await getOrgId();
  const sb = svc();

  const r = await sb.from('org_onboarding').select('data').eq('org_id', orgId).maybeSingle();
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });

  const data = (r.data?.data ?? {}) as any;
  return NextResponse.json({ ok: true, data: data?.[step] ?? {} });
}
