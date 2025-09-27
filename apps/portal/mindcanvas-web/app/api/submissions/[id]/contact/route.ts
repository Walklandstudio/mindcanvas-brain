import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Contact = { name: string | null; email: string | null; phone: string | null };

// GET /api/submissions/:id/contact  →  { name, email, phone }
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Load submission to find person_id
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('person_id')
    .eq('id', id)
    .maybeSingle<{ person_id: string | null }>();

  if (subErr || !sub) {
    return NextResponse.json({ error: subErr?.message || 'Submission not found' }, { status: 404 });
  }

  if (!sub.person_id) {
    return NextResponse.json({ name: null, email: null, phone: null } satisfies Contact);
  }

  const { data: person, error: personErr } = await supabaseAdmin
    .from('mc_people')
    .select('name, email, phone')
    .eq('id', sub.person_id)
    .maybeSingle<Contact>();

  if (personErr) {
    return NextResponse.json({ error: personErr.message }, { status: 500 });
  }

  return NextResponse.json({
    name: person?.name ?? null,
    email: person?.email ?? null,
    phone: person?.phone ?? null,
  } satisfies Contact);
}

// POST /api/submissions/:id/contact  body: { name?, email?, phone? }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<Contact> | null;

  if (!body) {
    return NextResponse.json({ error: 'Missing body' }, { status: 400 });
  }

  // Normalize empty strings → null
  const name = body.name?.toString().trim() || null;
  const email = body.email?.toString().trim() || null;
  const phone = body.phone?.toString().trim() || null;

  // Load submission
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .select('person_id')
    .eq('id', id)
    .maybeSingle<{ person_id: string | null }>();

  if (subErr || !sub) {
    return NextResponse.json({ error: subErr?.message || 'Submission not found' }, { status: 404 });
  }

  let personId = sub.person_id;

  // If we already have a person_id → update that record
  if (personId) {
    const { error: updErr } = await supabaseAdmin
      .from('mc_people')
      .update({ name, email, phone })
      .eq('id', personId);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  } else {
    // No person yet: if email exists, try match; else create new person if any field present
    if (email) {
      const { data: existing } = await supabaseAdmin
        .from('mc_people')
        .select('id')
        .eq('email', email)
        .maybeSingle<{ id: string }>();

      if (existing?.id) {
        // Update matched person & attach to submission
        const [{ error: updErr }, { error: linkErr }] = await Promise.all([
          supabaseAdmin.from('mc_people').update({ name, phone }).eq('id', existing.id),
          supabaseAdmin.from('mc_submissions').update({ person_id: existing.id }).eq('id', id),
        ]);
        if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
        if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
        personId = existing.id;
      } else {
        // Insert new person with email
        const { data: ins, error: insErr } = await supabaseAdmin
          .from('mc_people')
          .insert({ name, email, phone })
          .select('id')
          .single<{ id: string }>();
        if (insErr || !ins) return NextResponse.json({ error: insErr?.message || 'Failed to create person' }, { status: 500 });

        const { error: linkErr } = await supabaseAdmin
          .from('mc_submissions')
          .update({ person_id: ins.id })
          .eq('id', id);
        if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
        personId = ins.id;
      }
    } else if (name || phone) {
      // Create person without email
      const { data: ins, error: insErr } = await supabaseAdmin
        .from('mc_people')
        .insert({ name, email: null, phone })
        .select('id')
        .single<{ id: string }>();
      if (insErr || !ins) return NextResponse.json({ error: insErr?.message || 'Failed to create person' }, { status: 500 });

      const { error: linkErr } = await supabaseAdmin
        .from('mc_submissions')
        .update({ person_id: ins.id })
        .eq('id', id);
      if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
      personId = ins.id;
    } // else all null → no-op, keep submission anonymous
  }

  return NextResponse.json({ ok: true, name, email, phone });
}
