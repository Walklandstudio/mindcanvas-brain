import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Row = {
  submission_id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  profile_code: string | null;
  flow_a: number | null;
  flow_b: number | null;
  flow_c: number | null;
  flow_d: number | null;
};

type Item = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  profile_code: string | null;
  flow: { A: number; B: number; C: number; D: number } | null;
};

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('v_mc_clients_list')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  const rows: Row[] = (data ?? []) as Row[];

  const items: Item[] = rows.map((r) => ({
    id: r.submission_id,
    created_at: r.created_at,
    name: r.name,
    email: r.email,
    phone: r.phone,
    profile_code: r.profile_code,
    flow:
      r.flow_a === null || r.flow_b === null || r.flow_c === null || r.flow_d === null
        ? null
        : { A: Number(r.flow_a), B: Number(r.flow_b), C: Number(r.flow_c), D: Number(r.flow_d) },
  }));

  return NextResponse.json({ items });
}
