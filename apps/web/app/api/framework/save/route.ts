import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

type ProfileDTO = {
  id?: string;
  name: string;
  frequency: 'A' | 'B' | 'C' | 'D';
  ordinal: number;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { profiles: ProfileDTO[] };
  if (!Array.isArray(body?.profiles) || body.profiles.length !== 8) {
    return NextResponse.json({ error: 'Expected 8 profiles' }, { status: 400 });
  }

  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  const rows = body.profiles.map((p) => ({
    id: p.id ?? undefined,
    org_id: orgId,
    framework_id: frameworkId,
    name: p.name?.trim() || 'Untitled',
    frequency: p.frequency,
    ordinal: p.ordinal,
  }));

  const { data, error } = await svc
    .from('org_profiles')
    .upsert(rows, { onConflict: 'id' })
    .select('id, name, frequency, ordinal')
    .order('ordinal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data ?? [] });
}
