// app/api/submissions/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('mc_submissions').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

type Body = Partial<{ first_name: string; last_name: string; email: string; phone: string }>;

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const update: Record<string, string> = {};
  if (body.first_name) update.first_name = body.first_name.trim();
  if (body.last_name) update.last_name = body.last_name.trim();
  if (body.email) update.email = body.email.trim();
  if (body.phone) update.phone = body.phone.trim();

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from('mc_submissions')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

