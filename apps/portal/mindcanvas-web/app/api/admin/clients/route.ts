import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  // Join latest result per submission + person details
  const { data, error } = await supabaseAdmin
    .rpc('mc_clients_list'); // create a view or function to shape this

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
