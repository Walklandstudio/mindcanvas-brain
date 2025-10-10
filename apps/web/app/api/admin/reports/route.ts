import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export async function GET() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  const { data: profiles } = await svc
    .from('org_profiles')
    .select('id,name,frequency,ordinal')
    .eq('org_id', orgId).eq('framework_id', frameworkId)
    .order('ordinal', { ascending: true });

  const { data: drafts } = await svc
    .from('org_profile_reports')
    .select('profile_id, sections');

  const map: Record<string, any> = {};
  for (const d of drafts ?? []) map[d.profile_id] = d.sections ?? {};

  return NextResponse.json({ profiles, drafts: map });
}

export async function POST(req: Request) {
  const body = await req.json() as { profileId: string; sections: any };
  if (!body?.profileId) return NextResponse.json({ error:'Missing profileId' }, { status:400 });

  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  const up = {
    org_id: orgId,
    framework_id: frameworkId,
    profile_id: body.profileId,
    sections: body.sections ?? {},
  };

  const { error } = await svc
    .from('org_profile_reports')
    .upsert(up, { onConflict:'profile_id' });

  if (error) return NextResponse.json({ error: error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
