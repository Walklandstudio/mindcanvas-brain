import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Contact = { name: string | null; email: string | null; phone: string | null };

// GET /api/submissions/:id/contact  →  { name, email, phone }
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from('mc_submissions')
    .select('name, email, phone')
    .eq('id', id)
    .maybeSingle<Contact>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  return NextResponse.json({
    name: data.name ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
  } satisfies Contact);
}

// POST /api/submissions/:id/contact  body: { name, email, phone }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<Contact> | null;
  if (!body) return NextResponse.json({ error: 'Missing body' }, { status: 400 });

  const name = body.name?.toString().trim() || null;
  const email = body.email?.toString().trim() || null;
  const phone = body.phone?.toString().trim() || null;

  const { error } = await supabaseAdmin
    .from('mc_submissions')
    .update({ name, email, phone })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name, email, phone });
}
