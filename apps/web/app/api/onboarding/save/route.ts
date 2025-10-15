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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const step = String(body.step || 'company');
  const patch = (body.data ?? {}) as Record<string, any>;
  const orgId = await getOrgId();
  const sb = svc();

  // Ensure row exists
  const ex = await sb.from('org_onboarding').select('data').eq('org_id', orgId).maybeSingle();
  const existing = (ex.data?.data ?? {}) as any;

  // Merge by step key
  const nextData = {
    ...existing,
    [step]: { ...(existing?.[step] ?? {}), ...patch },
  };

  if (!ex.data) {
    const ins = await sb.from('org_onboarding').insert([{ org_id: orgId, data: nextData }]).select('org_id').maybeSingle();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  } else {
    const upd = await sb.from('org_onboarding').update({ data: nextData }).eq('org_id', orgId);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
