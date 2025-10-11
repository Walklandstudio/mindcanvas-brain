import 'server-only';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const role = process.env.SUPABASE_SERVICE_ROLE!;
const svc  = () => createServerClient(url, role, { auth:{ persistSession:false, autoRefreshToken:false } });

async function getOrgId() {
  // For staging: use first org
  const { data, error } = await svc().from('organizations').select('id').order('created_at').limit(1).single();
  if (error || !data) throw new Error('No org found');
  return data.id as string;
}

export async function GET() {
  const orgId = await getOrgId();
  const { data, error } = await svc().from('org_onboarding').select('*').eq('org_id', orgId).single();
  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ onboarding: data ?? { company:{}, branding:{}, goals:{} } });
}

export async function POST(req: Request) {
  const orgId = await getOrgId();
  const body = await req.json();

  const patch: any = { org_id: orgId };
  if (body.company   !== undefined) patch.company   = body.company;
  if (body.branding  !== undefined) patch.branding  = body.branding;
  if (body.goals     !== undefined) patch.goals     = body.goals;

  const { data, error } = await svc()
    .from('org_onboarding')
    .upsert(patch, { onConflict: 'org_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ onboarding: data });
}
