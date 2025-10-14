import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { orgSlug } = await req.json();
  if (!orgSlug) return NextResponse.json({ error: 'orgSlug required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // service role to call the SQL function
  );

  const { error } = await supabase.rpc('seed_base_questions', { p_org_slug: orgSlug });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
