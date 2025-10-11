import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!  // server-only secret
  );
}

type Seed = { name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };

function seedFrom(goals: any): Seed[] {
  const industry = (goals?.industry || '').toLowerCase();
  const sector   = (goals?.sector || '').toLowerCase();

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
  try {
    const s = svc();

    // Who am I? Get current user's org via your existing bootstrap mapping.
    // For demo we assume a single org row exists and take the first.
    const { data: org } = await s.from('orgs').select('id').limit(1).single();
    if (!org?.id) return NextResponse.json({ error: 'No org' }, { status: 400 });
    const orgId = org.id as string;

    // Ensure framework (one per org).
    let { data: fw } = await s
      .from('org_frameworks')
      .select('id, org_id, version')
      .eq('org_id', orgId)
      .limit(1)
      .single();

    if (!fw) {
      const ins = await s.from('org_frameworks')
        .insert({ org_id: orgId, name: 'Signature', version: 1 })
        .select('id, org_id, version')
        .single();
      if (ins.error) throw ins.error;
      fw = ins.data!;
    }

    // Read goals
    const { data: ob } = await s.from('org_onboarding')
      .select('goals')
      .eq('org_id', orgId)
      .single();

    const seeds = seedFrom(ob?.goals ?? {});

    // Replace profiles
    await s.from('org_profiles')
      .delete().eq('org_id', orgId).eq('framework_id', fw.id);

    const ins2 = await s.from('org_profiles').insert(
      seeds.map(x => ({ org_id: orgId, framework_id: fw.id, ...x }))
    );
    if (ins2.error) throw ins2.error;

    return NextResponse.json({ ok: true, profilesSeeded: seeds.length, frameworkId: fw.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
