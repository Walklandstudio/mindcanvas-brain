import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const [subs, people, tests] = await Promise.all([
    supabaseAdmin.from('mc_submissions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('mc_people').select('*', { count: 'exact', head: true }).throwOnError(),
    supabaseAdmin.from('mc_tests').select('*', { count: 'exact', head: true }).throwOnError(),
  ]);
  return NextResponse.json({
    submissions: subs.count || 0,
    clients: people.count || 0,
    tests: tests.count || 0,
  });
}
