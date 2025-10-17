import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import { orgIdFromAuth } from '@/app/_lib/org';

export async function POST(req: Request) {
  const { testId } = await req.json();
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) return NextResponse.json({ error: 'no-org' }, { status: 400 });

  // Pull brand voice + test structure to render a preview payload
  const [{ data: brand }, { data: test }] = await Promise.all([
    sb.from('org_brand_settings').select('brand_voice,audience,notes').eq('org_id', orgId).maybeSingle(),
    sb.from('org_tests')
      .select(`
        id,name,mode,status,
        test_questions (
          id,idx,stem,stem_rephrased,
          test_options (id,idx,label,label_rephrased,frequency,profile,points)
        )
      `)
      .eq('id', testId)
      .single(),
  ]);

  if (!test) return NextResponse.json({ error: 'test-not-found' }, { status: 404 });

  // Minimal preview renderer (replace with your real report build)
  const preview = {
    test: { id: test.id, name: test.name, mode: test.mode },
    brand_voice: brand?.brand_voice ?? '',
    sections: test.test_questions
      .sort((a: any, b: any) => a.idx - b.idx)
      .map((q: any) => ({
        question: q.stem_rephrased ?? q.stem,
        options: q.test_options
          .sort((a: any, b: any) => a.idx - b.idx)
          .map((o: any) => o.label_rephrased ?? o.label),
      })),
  };

  return NextResponse.json({ preview });
}
