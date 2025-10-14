import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

export async function POST() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // Simple deterministic seed; customize/replace with your generator if needed.
  const seed = [
    { name: 'Visionary',  frequency: 'A', ordinal: 1 },
    { name: 'Spark',      frequency: 'A', ordinal: 2 },
    { name: 'Connector',  frequency: 'B', ordinal: 3 },
    { name: 'Nurturer',   frequency: 'B', ordinal: 4 },
    { name: 'Anchor',     frequency: 'C', ordinal: 5 },
    { name: 'Architect',  frequency: 'C', ordinal: 6 },
    { name: 'Analyst',    frequency: 'D', ordinal: 7 },
    { name: 'Specialist', frequency: 'D', ordinal: 8 },
  ].map((p) => ({ ...p, org_id: orgId, framework_id: frameworkId }));

  await svc.from('org_profiles').delete().eq('org_id', orgId).eq('framework_id', frameworkId);

  const { data, error } = await svc
    .from('org_profiles')
    .insert(seed)
    .select('id, name, frequency, ordinal')
    .order('ordinal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data ?? [] });
}
