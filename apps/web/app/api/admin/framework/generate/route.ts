import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../../_lib/org';

type Seed = { name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };

function seedFrom(goals: any): Seed[] {
  const industry = (goals?.industry || '').toLowerCase();
  const sector   = (goals?.sector || '').toLowerCase();

  // very light heuristic; customize as needed
  const A = ['Visionary','Spark'];
  const B = sector.includes('b2c') || industry.includes('media') ? ['Connector','Storyteller'] : ['Connector','Nurturer'];
  const C = ['Anchor','Architect'];
  const D = industry.includes('saas') || industry.includes('finance') ? ['Analyst','Specialist'] : ['Analyst','Operator'];

  return [
    { name: A[0], frequency:'A', ordinal:1 },
    { name: A[1], frequency:'A', ordinal:2 },
    { name: B[0], frequency:'B', ordinal:3 },
    { name: B[1], frequency:'B', ordinal:4 },
    { name: C[0], frequency:'C', ordinal:5 },
    { name: C[1], frequency:'C', ordinal:6 },
    { name: D[0], frequency:'D', ordinal:7 },
    { name: D[1], frequency:'D', ordinal:8 },
  ];
}

export async function POST() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  const { data: onboarding } = await svc
    .from('org_onboarding').select('goals').eq('org_id', orgId).single();

  const rows = seedFrom(onboarding?.goals ?? {}).map(s => ({
    org_id: orgId, framework_id: frameworkId, ...s
  }));

  // Replace the 8 in one go (simplest & predictable)
  await svc.from('org_profiles').delete()
    .eq('org_id', orgId).eq('framework_id', frameworkId);

  const { data, error } = await svc
    .from('org_profiles')
    .insert(rows)
    .select('id, name, frequency, ordinal')
    .order('ordinal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data });
}
