import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

export async function GET(_req: Request, { params }: any) {
  const token = params?.token as string;
  if (!token) return NextResponse.json({ ok:false, error:'missing token' }, { status:400 });

  const a = admin();
  const { data: link } = await a
    .from('test_links')
    .select('test_id')
    .eq('token', token)
    .maybeSingle();
  if (!link) return NextResponse.json({ ok:false, error:'invalid link' }, { status:404 });

  const { data, error } = await a
    .from('test_questions')
    .select('id, text, type, "order"')
    .eq('test_id', link.test_id)
    .order('order', { ascending: true });

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, data });
}
