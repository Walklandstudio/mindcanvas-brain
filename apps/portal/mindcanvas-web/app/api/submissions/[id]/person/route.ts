// app/api/submissions/[id]/person/route.ts
// Save test-taker details for a submission. Supports POST and PATCH.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // don't cache this route
export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

type Body = Partial<{
  first_name: string;
  last_name: string;
  first: string; // tolerate alternate field names
  last: string;
  email: string;
  phone: string;
}>;

const toStr = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function normalize(payload: unknown) {
  const b = (payload ?? {}) as Body;
  const first_name = toStr(b.first_name ?? b.first);
  const last_name = toStr(b.last_name ?? b.last);
  const email = toStr(b.email);
  const phone = toStr(b.phone);
  return { first_name, last_name, email, phone };
}

async function upsertPerson(req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing submission id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { first_name, last_name, email, phone } = normalize(body);

  if (!first_name && !last_name && !email && !phone) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const update: Record<string, string> = {};
  if (first_name) update.first_name = first_name;
  if (last_name) update.last_name = last_name;
  if (email) update.email = email;
  if (phone) update.phone = phone;

  const { error } = await sb
    .from('mc_submissions')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// Support both POST and PATCH so the UI can use either.
export async function POST(req: Request, p: RouteParams) {
  return upsertPerson(req, p);
}
export async function PATCH(req: Request, p: RouteParams) {
  return upsertPerson(req, p);
}
