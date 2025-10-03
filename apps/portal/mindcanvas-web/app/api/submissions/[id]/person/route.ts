// app/api/submissions/[id]/person/route.ts
// Save/patch person (first_name, last_name, email, phone) for a submission.

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

function norm(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

function coerce(body: unknown): PersonPatch {
  const b = (body ?? {}) as Record<string, unknown>;
  // accept common aliases just in case
  const first_name = norm(b.first_name ?? b.first);
  const last_name = norm(b.last_name ?? b.last);
  const email = norm(b.email);
  const phone = norm(b.phone);
  const out: PersonPatch = {};
  if (first_name) out.first_name = first_name;
  if (last_name) out.last_name = last_name;
  if (email) out.email = email;
  if (phone) out.phone = phone;
  return out;
}

async function save(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing submission id' }, { status: 400 });

  const patch = coerce(await req.json().catch(() => ({})));
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

export async function POST(req: NextRequest, ctx: RouteParams) {
  return save(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  return save(req, ctx);
}

// Handy GET so you can hit the URL in the browser to verify this exact file is live.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return NextResponse.json({ ok: true, id, hint: 'POST/PATCH JSON { first_name, last_name, email, phone }' });
}

// CORS/preflight safety (even if you don’t need CORS, this prevents 405 on OPTIONS)
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
