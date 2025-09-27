import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Body = {
  slug: string;            // e.g. "competency-coach-dna"
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body | null;
  if (!body?.slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }
  const slug = body.slug;
  const name = (body.name ?? '').trim() || null;
  const email = (body.email ?? '').trim() || null;
  const phone = (body.phone ?? '').trim() || null;

  // 1) Find test by slug
  const { data: test, error: testErr } = await supabaseAdmin
    .from('mc_tests')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle<{ id: string; slug: string }>();

  if (testErr || !test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  // 2) Resolve/attach person ONLY if we have a valid email
  let personId: string | null = null;

  if (email) {
    // Upsert-or-link by email
    const { data: existing } = await supabaseAdmin
      .from('mc_people')
      .select('id')
      .eq('email', email)
      .maybeSingle<{ id: string }>();

    if (existing?.id) {
      // Update name/phone if provided, ignore nulls
      const updates: Record<string, string | null> = {};
      if (name !== null) updates.name = name;
      if (phone !== null) updates.phone = phone;
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('mc_people').update(updates).eq('id', existing.id);
      }
      personId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('mc_people')
        .insert({ name, email, phone })
        .select('id')
        .single<{ id: string }>();

      if (insertErr || !inserted) {
        return NextResponse.json({ error: insertErr?.message || 'Failed to create person' }, { status: 500 });
      }
      personId = inserted.id;
    }
  }
  // NOTE: if no email -> leave personId = null (anonymous submission).
  // The test page can capture details later via /api/submissions/:id/contact.

  // 3) Create a new submission
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .insert({ test_id: test.id, person_id: personId })
    .select('id')
    .single<{ id: string }>();

  if (subErr || !sub) {
    return NextResponse.json({ error: subErr?.message || 'Failed to create submission' }, { status: 500 });
  }

  // 4) Return unique link
  const url = `/test/${test.slug}?sid=${encodeURIComponent(sub.id)}`;
  return NextResponse.json({ submissionId: sub.id, url });
}
