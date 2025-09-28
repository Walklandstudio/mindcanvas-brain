import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type PatchBody = {
  name?: string;
  email?: string;
  phone?: string;
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as PatchBody;

  // basic validation
  const updates: PatchBody = {};
  if (typeof body.name === 'string')  updates.name  = body.name.trim();
  if (typeof body.email === 'string') updates.email = body.email.trim();
  if (typeof body.phone === 'string') updates.phone = body.phone.trim();

  if (!updates.name || !updates.email || !updates.phone) {
    return NextResponse.json(
      { error: 'name, email, and phone are required' },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from('mc_submissions')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
