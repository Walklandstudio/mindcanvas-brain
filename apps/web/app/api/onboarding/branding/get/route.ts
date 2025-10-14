import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../../_lib/org';

export async function GET() {
  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();
  const { data } = await svc.from('org_onboarding').select('branding').eq('org_id', orgId).single();
  return NextResponse.json({ branding: data?.branding || {} });
}
