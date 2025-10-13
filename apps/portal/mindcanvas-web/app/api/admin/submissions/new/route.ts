import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Body = { slug: string };

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body | null;
  const slug = body?.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const { data: test, error: tErr } = await supabaseAdmin
    .from('mc_tests')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle<{ id: string; slug: string }>();

  if (tErr || !test) {
    return NextResponse.json({ error: tErr?.message || 'Test not found' }, { status: 404 });
  }

  const { data: sub, error: sErr } = await supabaseAdmin
    .from('mc_submissions')
    .insert({ test_id: test.id })
    .select('id')
    .single<{ id: string }>();

  if (sErr || !sub) {
    return NextResponse.json({ error: sErr?.message || 'Failed to create submission' }, { status: 500 });
  }

  return NextResponse.json({ submissionId: sub.id, testSlug: test.slug });
}
