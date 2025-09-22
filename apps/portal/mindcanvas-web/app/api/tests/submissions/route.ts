import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const body = await req.json();
  const { org_slug, first_name, last_name, email, phone } = body ?? {};

  if (!org_slug || !first_name || !last_name || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data: org, error: oErr } = await supabase
    .from('organizations').select('id').eq('slug', org_slug).single();
  if (oErr || !org) return NextResponse.json({ error: 'Invalid org_slug' }, { status: 400 });

  const { data: test, error: tErr } = await supabase
    .from('mc_tests').select('id').eq('org_id', org.id).eq('slug', slug).single();
  if (tErr || !test) return NextResponse.json({ error: 'Test not found for org' }, { status: 404 });

  const { data: client, error: cErr } = await supabase
    .from('clients')
    .upsert([{ org_slug, first_name, last_name, email: String(email).toLowerCase(), phone }], { onConflict: 'org_slug,email' })
    .select('id').single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const { data: sub, error: sErr } = await supabase
    .from('mc_submissions')
    .insert([{
      org_id: org.id, test_id: test.id, client_id: client.id,
      first_name, last_name, email: String(email).toLowerCase(), phone
    }]).select('id').single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  return NextResponse.json({ submission_id: sub.id }, { status: 201 });
}
