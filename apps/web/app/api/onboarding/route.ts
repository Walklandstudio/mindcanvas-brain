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

  return NextResponse.json({
    onboarding: data ?? { company: {}, branding: {}, goals: {} },
  });
}

export async function POST(req: Request) {
  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();
  const patch = await req.json(); // may contain company/branding/goals (one or many)

  // Load current, shallow-merge per section
  const { data: current } = await svc
    .from('org_onboarding')
    .select('*')
    .eq('org_id', orgId)
    .single();

  const merged = {
    org_id: orgId,
    company:  { ...(current?.company ?? {}),  ...(patch.company  ?? {}) },
    branding: { ...(current?.branding ?? {}), ...(patch.branding ?? {}) },
    goals:    { ...(current?.goals ?? {}),    ...(patch.goals    ?? {}) },
  };

  const { data, error } = await svc
    .from('org_onboarding')
    .upsert(merged, { onConflict: 'org_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ onboarding: data });
}
