import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const ins = await supabaseAdmin
      .from('mc_submissions')
      .insert([{}])
      .select('id')
      .single();

    if (ins.error) {
      return NextResponse.json({ ok: false, stage: 'insert', error: ins.error.message }, { status: 200 });
    }

    const id = ins.data?.id as string | undefined;
    if (id) {
      await supabaseAdmin.from('mc_submissions').delete().eq('id', id);
    }
    return NextResponse.json({ ok: true, stage: 'insert', note: 'insert+delete ok' }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, stage: 'exception', error: msg }, { status: 200 });
  }
}
