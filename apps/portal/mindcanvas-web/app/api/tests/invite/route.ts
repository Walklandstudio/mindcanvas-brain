import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Body = {
  slug: string;            // e.g., "competency-coach"
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body | null;
  if (!body?.slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }
  const { slug, name = null, email = null, phone = null } = body;

  // 1) Find test by slug
  const { data: test, error: testErr } = await supabaseAdmin
    .from('mc_tests')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle<{ id: string; slug: string }>();

  if (testErr || !test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  // 2) Upsert (or create) person if email present; else anonymous person
  let personId: string | null = null;

  if (email) {
    const { data: personExisting } = await supabaseAdmin
      .from('mc_people')
      .select('id')
      .eq('email', email)
      .maybeSingle<{ id: string }>();

    if (personExisting?.id) {
      // Update name/phone if provided
      await supabaseAdmin
        .from('mc_people')
        .update({ name, phone })
        .eq('id', personExisting.id);

      personId = personExisting.id;
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
  } else if (name || phone) {
    // Create a person without email
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('mc_people')
      .insert({ name, email: null, phone })
      .select('id')
      .single<{ id: string }>();
    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to create person' }, { status: 500 });
    }
    personId = inserted.id;
  }

  // 3) Create a new submission
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('mc_submissions')
    .insert({
      test_id: test.id,
      person_id: personId,
      // optional: seed status fields if you have them
    })
    .select('id')
    .single<{ id: string }>();

  if (subErr || !sub) {
    return NextResponse.json({ error: subErr?.message || 'Failed to create submission' }, { status: 500 });
  }

  // 4) Return a unique link the participant can open directly
  const url = `/test/${test.slug}?sid=${encodeURIComponent(sub.id)}`;
  return NextResponse.json({ submissionId: sub.id, url });
}
