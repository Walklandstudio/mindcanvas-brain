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

export async function GET() {
  const orgId = await getOrgId();
  const sb = svc();

  const fw = await sb.from('org_frameworks').select('id, frequency_meta').eq('org_id', orgId).maybeSingle();
  if (fw.error) return NextResponse.json({ error: fw.error.message }, { status: 500 });

  const profiles = await sb
    .from('org_profiles')
    .select('id,name,frequency,ordinal,image_url')
    .eq('org_id', orgId)
    .eq('framework_id', fw.data?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('ordinal', { ascending: true });

  return NextResponse.json({
    ok: true,
    framework_id: fw.data?.id ?? null,
    frequency_meta: fw.data?.frequency_meta ?? null,
    profiles: profiles.data ?? [],
  });
}
