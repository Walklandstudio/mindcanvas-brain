import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../../_lib/org';

export async function POST() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  const { data: profiles } = await svc
    .from('org_profiles').select('id, frequency, ordinal')
    .eq('org_id', orgId).eq('framework_id', frameworkId).order('ordinal');

  if (!profiles?.length) return NextResponse.json({ error: 'No profiles' }, { status: 400 });

  // simple heuristic: same frequency=80, adjacent=60, opposite=40
  const freqOrder = ['A','B','C','D'] as const;
  const scoreFor = (fa: string, fb: string) => {
    const da = freqOrder.indexOf(fa as any);
    const db = freqOrder.indexOf(fb as any);
    const diff = Math.abs(da - db);
    return diff === 0 ? 80 : diff === 1 ? 60 : 40;
  };

  const upserts: any[] = [];
  for (let i=0;i<profiles.length;i++){
    for (let j=i+1;j<profiles.length;j++){
      upserts.push({
        org_id: orgId,
        framework_id: frameworkId,
        profile_a: profiles[i].id,
        profile_b: profiles[j].id,
        score: scoreFor(profiles[i].frequency, profiles[j].frequency),
      });
    }
  }

  await svc.from('org_profile_compatibility').delete().eq('framework_id', frameworkId);
  const { error } = await svc.from('org_profile_compatibility').insert(upserts);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
