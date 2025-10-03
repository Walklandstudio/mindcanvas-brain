/* app/api/submissions/[id]/person/route.ts
 * Save/patch the test-taker's details for a submission.
 * Accepts POST and PATCH with JSON:
 * {
 *   "first_name": "Lisa",
 *   "last_name": "Walker",
 *   "email": "lisa@studiods.co.za",
 *   "phone": "0608288181"
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Params = { params: Promise<{ id: string }> };

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

function asRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
const toStr = (v: unknown) => (typeof v === 'string' ? v : '');

function normalize(body: unknown) {
  const b: Body = asRecord(body) ? (body as Body) : {};
  const first_name = toStr(b.first_name ?? b.first).trim();
  const last_name = toStr(b.last_name ?? b.last).trim();
  const email = toStr(b.email).trim();
  const phone = toStr(b.phone).trim();
  return { first_name, last_name, email, phone };
}

async function upsertPerson(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing submission id' }, { status: 400 });
  }

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const { first_name, last_name, email, phone } = normalize(raw);

  if (!first_name && !last_name && !email && !phone) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { error } = await sb
    .from('mc_submissions')
    .update({
      ...(first_name ? { first_name } : {}),
      ...(last_name ? { last_name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// Support both POST and PATCH so the UI works either way.
export async function POST(req: Request, p: Params) {
  return upsertPerson(req, p);
}
export async function PATCH(req: Request, p: Params) {
  return upsertPerson(req, p);
}
