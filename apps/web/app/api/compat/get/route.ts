import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

export async function GET() {
  const svc = admin();
  const { frameworkId } = await getOwnerOrgAndFramework();

  const { data, error } = await svc
    .from('org_profile_compatibility')
    .select('profile_a, profile_b, score')
    .eq('framework_id', frameworkId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pairs: data ?? [] });
}
