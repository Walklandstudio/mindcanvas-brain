import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(_req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, name, email, phone, mc_results:mc_results (profile_code, flow_a, flow_b, flow_c, flow_d)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r: any) => ({
    id: r.id as string,
    created_at: r.created_at as string,
    name: r.name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    profile_code: r.mc_results?.profile_code ?? null,
    flow_a: r.mc_results?.flow_a ?? 0,
    flow_b: r.mc_results?.flow_b ?? 0,
    flow_c: r.mc_results?.flow_c ?? 0,
    flow_d: r.mc_results?.flow_d ?? 0,
  }));

  return NextResponse.json(rows);
}
