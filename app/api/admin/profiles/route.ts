import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
}
function userClient(bearer: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: bearer } } }
  );
}
async function getOrgId(bearer: string) {
  const u = userClient(bearer);
  const { data } = await u.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return null;
  const a = admin();
  const { data: m } = await a.from('org_memberships').select('org_id').eq('user_id', uid).limit(1);
  return m?.[0]?.org_id ?? null;
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok: false, error: 'missing bearer' }, { status: 401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok: false, error: 'no org' }, { status: 401 });

  const a = admin();
  const { data, error } = await a.from('profiles').select('*').eq('org_id', orgId).order('key', { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  // seed defaults if none exist
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ ok: false, error: 'missing bearer' }, { status: 401 });
  const orgId = await getOrgId(auth);
  if (!orgId) return NextResponse.json({ ok: false, error: 'no org' }, { status: 401 });

  const a = admin();
  const { data: existing } = await a.from('profiles').select('id').eq('org_id', orgId).limit(1);
  if (existing?.length) return NextResponse.json({ ok: true, seeded: false });

  const defs = [
    { key: 'A1', freq_key: 'A', name: 'A1 Pioneer', color: '#1f2937', description: 'Default description A1' },
    { key: 'A2', freq_key: 'A', name: 'A2 Catalyst', color: '#374151', description: 'Default description A2' },
    { key: 'B1', freq_key: 'B', name: 'B1 Strategist', color: '#0f766e', description: 'Default description B1' },
    { key: 'B2', freq_key: 'B', name: 'B2 Architect', color: '#115e59', description: 'Default description B2' },
    { key: 'C1', freq_key: 'C', name: 'C1 Collaborator', color: '#7c3aed', description: 'Default description C1' },
    { key: 'C2', freq_key: 'C', name: 'C2 Facilitator', color: '#6d28d9', description: 'Default description C2' },
    { key: 'D1', freq_key: 'D', name: 'D1 Guardian', color: '#b45309', description: 'Default description D1' },
    { key: 'D2', freq_key: 'D', name: 'D2 Steward', color: '#92400e', description: 'Default description D2' }
  ];

  const rows = defs.map(d => ({ org_id: orgId, ...d }));
  const { error } = await a.from('profiles').insert(rows);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // ensure template row exists
  await a.from('report_templates').upsert({ org_id: orgId });

  return NextResponse.json({ ok: true, seeded: true });
}
