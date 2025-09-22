import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;

  const { data: testRow, error: tErr } = await supabase
    .from('mc_tests').select('id').eq('slug', slug).single();

  if (tErr || !testRow) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('mc_questions')
    .select('id, idx, text, kind, required, mc_options(id, idx, label)')
    .eq('test_id', testRow.id)
    .order('idx', { ascending: true })
    .order('idx', { foreignTable: 'mc_options', ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ test_id: testRow.id, slug, questions: data ?? [] });
}
