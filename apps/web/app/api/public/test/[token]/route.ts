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
  const { data, error } = await a
    .from('test_links')
    .select('token, test_id, tests(name)')
    .eq('token', token)
    .limit(1)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok:false, error:'invalid link' }, { status:404 });

  return NextResponse.json({ ok:true, data: { token: data.token, test_id: data.test_id, name: (data as any).tests?.name ?? 'Test' }});
}

export async function POST(req: Request, { params }: any) {
  const token = params?.token as string;
  if (!token) return NextResponse.json({ ok:false, error:'missing token' }, { status:400 });

  const body = await req.json().catch(() => ({}));
  const a = admin();

  const { data: link } = await a.from('test_links').select('test_id, token').eq('token', token).maybeSingle();
  if (!link) return NextResponse.json({ ok:false, error:'invalid link' }, { status:404 });

  const payload = {
    test_id: link.test_id,
    token: link.token,
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    team: body.team ?? null,
    team_function: body.team_function ?? null
  };

  const { data, error } = await a.from('test_takers').insert(payload).select('id').single();
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  return NextResponse.json({ ok:true, id: data.id });
}
