import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Row = {
  id: string;
  updated_at: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  password_note: string | null;
  company_name: string | null;
  website: string | null;
  linkedin: string | null;
  industry: string | null;
  sector: string | null;
  logo_url: string | null;
};

type Payload = {
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  phone: string;
  password_note: string;
  company_name: string;
  website: string;
  linkedin: string;
  industry: string;
  sector: string;
  logo_url: string;
};

export async function GET() {
  const res = await supabaseAdmin
    .from('app_profile')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<Row>();

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const r = res.data;
  const data = r
    ? {
        first_name: r.first_name ?? '',
        last_name: r.last_name ?? '',
        position: r.position ?? '',
        email: r.email ?? '',
        phone: r.phone ?? '',
        password_note: r.password_note ?? '',
        company_name: r.company_name ?? '',
        website: r.website ?? '',
        linkedin: r.linkedin ?? '',
        industry: r.industry ?? '',
        sector: r.sector ?? '',
        logo_url: r.logo_url ?? '',
        updated_at: r.updated_at ?? undefined,
      }
    : null;

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Payload;

  const existing = await supabaseAdmin
    .from('app_profile')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  const payload: Omit<Row, 'id' | 'updated_at'> = {
    first_name: body.first_name || null,
    last_name: body.last_name || null,
    position: body.position || null,
    email: body.email || null,
    phone: body.phone || null,
    password_note: body.password_note || null,
    company_name: body.company_name || null,
    website: body.website || null,
    linkedin: body.linkedin || null,
    industry: body.industry || null,
    sector: body.sector || null,
    logo_url: body.logo_url || null,
  };

  if (existing.data?.id) {
    const upd = await supabaseAdmin
      .from('app_profile')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id)
      .select('id')
      .maybeSingle();

    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: upd.data?.id });
  } else {
    const ins = await supabaseAdmin
      .from('app_profile')
      .insert({ ...payload, updated_at: new Date().toISOString() })
      .select('id')
      .maybeSingle();

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: ins.data?.id });
  }
}
