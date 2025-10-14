import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

export async function GET() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  const { data, error } = await svc
    .from('org_profiles')
    .select('id, name, frequency, ordinal')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .order('ordinal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data ?? [] });
}
