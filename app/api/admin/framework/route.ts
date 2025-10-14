// apps/web/app/api/admin/framework/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

type ProfileDTO = {
  id?: string;
  name: string;
  frequency: 'A' | 'B' | 'C' | 'D';
  ordinal: number; // 1..8
};

// GET → current 8 profiles (seed if missing)
export async function GET() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // Load existing
  let { data: profiles, error } = await svc
    .from('org_profiles')
    .select('id, name, frequency, ordinal')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .order('ordinal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!profiles || profiles.length === 0) {
    // Seed 8 placeholders (2 per frequency)
    const seed: Omit<ProfileDTO, 'id'>[] = [
      { name: 'Visionary', frequency: 'A', ordinal: 1 },
      { name: 'Spark',     frequency: 'A', ordinal: 2 },
      { name: 'Connector', frequency: 'B', ordinal: 3 },
      { name: 'Nurturer',  frequency: 'B', ordinal: 4 },
      { name: 'Anchor',    frequency: 'C', ordinal: 5 },
      { name: 'Architect', frequency: 'C', ordinal: 6 },
      { name: 'Analyst',   frequency: 'D', ordinal: 7 },
      { name: 'Specialist',frequency: 'D', ordinal: 8 },
    ];

    const { data: inserted, error: insErr } = await svc
      .from('org_profiles')
      .insert(seed.map(s => ({ ...s, org_id: orgId, framework_id: frameworkId })))
      .select('id, name, frequency, ordinal')
      .order('ordinal', { ascending: true });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    profiles = inserted ?? [];
  }

  return NextResponse.json({ profiles });
}

// POST → upsert 8 profiles
export async function POST(req: Request) {
  const payload = (await req.json()) as { profiles: ProfileDTO[] };
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // Basic validation
  if (!payload?.profiles || payload.profiles.length !== 8) {
    return NextResponse.json({ error: 'Expected 8 profiles.' }, { status: 400 });
  }

  // Normalize
  const rows = payload.profiles.map(p => ({
    id: p.id ?? undefined,
    org_id: orgId,
    framework_id: frameworkId,
    name: p.name?.trim() || 'Untitled',
    frequency: p.frequency,
    ordinal: p.ordinal,
  }));

  // Upsert by id when present, otherwise insert
  const { data, error } = await svc
    .from('org_profiles')
    .upsert(rows, { onConflict: 'id' })
    .select('id, name, frequency, ordinal')
    .order('ordinal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data });
}