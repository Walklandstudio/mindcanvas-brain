// app/api/submissions/[id]/route.ts
// Also allow PATCH on the base resource as a fallback (UI can hit either path).

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

type PersonPatch = Partial<{
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}>;

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('mc_submissions').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as PersonPatch;
  const patch: PersonPatch = {};
  if (body.first_name) patch.first_name = body.first_name.trim();
  if (body.last_name) patch.last_name = body.last_name.trim();
  if (body.email) patch.email = body.email.trim();
  if (body.phone) patch.phone = body.phone.trim();

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from('mc_submissions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

