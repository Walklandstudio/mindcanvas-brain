/* app/api/submissions/[id]/route.ts
 * Saves test-taker details into mc_submissions (first_name, last_name, email, phone)
 * Accepts both { first, last } and { first_name, last_name }.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Params = { params: Promise<{ id: string }> };

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeBody(body: any) {
  // Accept both first/last and first_name/last_name
  const first_name = (body.first_name ?? body.first ?? '').toString().trim();
  const last_name  = (body.last_name  ?? body.last  ?? '').toString().trim();
  const email      = (body.email ?? '').toString().trim();
  const phone      = (body.phone ?? '').toString().trim();

  return { first_name, last_name, email, phone };
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing submission id' }, { status: 400 });
    }

    const payload = await req.json().catch(() => ({}));
    const { first_name, last_name, email, phone } = normalizeBody(payload);

    // Basic guard so empty payloads don’t wipe values
    if (!first_name && !last_name && !email && !phone) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const { error } = await sb
      .from('mc_submissions')
      .update({
        ...(first_name ? { first_name } : {}),
        ...(last_name  ? { last_name }  : {}),
        ...(email      ? { email }      : {}),
        ...(phone      ? { phone }      : {}),
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

/* Optional GET (handy for debugging from the client)
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('mc_submissions')
    .select('id, first_name, last_name, email, phone, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
*/

