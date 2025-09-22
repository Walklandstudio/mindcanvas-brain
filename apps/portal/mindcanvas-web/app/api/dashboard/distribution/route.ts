import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const org = new URL(req.url).searchParams.get('org') ?? 'competency-coach';
  const { data, error } = await supabase.from('v_profile_distribution').select('*').eq('org_slug', org);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

