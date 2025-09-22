import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const { error } = await supabase.rpc('mc_finish', { p_submission_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
