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
    onboarding: data ?? { org_id: orgId, company: {}, branding: {}, goals: {} },
  });
}

export async function POST(req: Request) {
  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();
  const body = await req.json().catch(() => ({} as any));

  // Load current row (if any)
  const { data: current, error: curErr } = await svc
    .from('org_onboarding')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (curErr && curErr.code !== 'PGRST116') {
    return NextResponse.json({ error: curErr.message }, { status: 500 });
  }

  // Shallow-merge at the section level; keep other sections intact
  const next = {
    org_id: orgId,
    company: {
      ...(current?.company ?? {}),
      ...(body.company ?? {}),
    },
    branding: {
      ...(current?.branding ?? {}),
      ...(body.branding ?? {}),
    },
    goals: {
      ...(current?.goals ?? {}),
      ...(body.goals ?? {}),
    },
  };

  const { data, error } = await svc
    .from('org_onboarding')
    .upsert(next, { onConflict: 'org_id' })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ onboarding: data });
}
