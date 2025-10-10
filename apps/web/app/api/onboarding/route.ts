import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../_lib/org';

export async function GET() {
  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();

  const { data, error } = await svc
    .from('org_onboarding')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ onboarding: data ?? { company: {}, branding: {}, goals: {} } });
}

export async function POST(req: Request) {
  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();
  const body = await req.json();

  const patch = {
    org_id: orgId,
    company: body.company ?? undefined,
    branding: body.branding ?? undefined,
    goals: body.goals ?? undefined,
  };

  const { data, error } = await svc
    .from('org_onboarding')
    .upsert(patch, { onConflict: 'org_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ onboarding: data });
}
