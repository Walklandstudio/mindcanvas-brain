// app/api/dashboard/latest/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

export async function GET() {
  const { data, error } = await supabase
    .from('mc_submissions')
    .select('id, created_at, full_profile_code, full_frequency')
    .order('created_at', { ascending: false })
    .limit(25);
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? [], { status: 200 });
}
