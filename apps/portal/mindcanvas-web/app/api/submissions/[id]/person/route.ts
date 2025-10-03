/* app/api/submissions/[id]/person/route.ts
 * Compatibility endpoint for saving a test-taker's details at:
 *   PATCH /api/submissions/:id/person
 * This mirrors the logic in /api/submissions/[id] so existing clients that call
 * “…/person” continue to work.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RouteParams = { params: Promise<{ id: string }> };

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

type BodyShape = Partial<{
  first_name: string;
  last_name: string;
  first: string;
  last: string;
  email: string;
  phone: string;
}>;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function toStr(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

function normalizeBody(body: unknown) {
  const src: BodyShape = isRecord(body) ? (body as BodyShape) : {};
  const first_name = toStr(src.first_name ?? src.first).trim();
  const last_name = toStr(src.last_name ?? src.last).trim();
  const email = toStr(src.email).trim();
  const phone = toStr(src.phone).trim();
  return { first_name, last_name, email, phone };
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing submission id' }, { status: 400 });
    }

    const raw = (await req.json().catch(() => ({}))) as unknown;
    const { first_name, last_name, email, phone } = normalizeBody(raw);

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
