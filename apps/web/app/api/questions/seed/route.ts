import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

    const orgId = await orgIdFromAuth(auth);
    if (!orgId) return NextResponse.json({ ok:false, error:'no_org' }, { status:401 });

    const a = admin();

    // If already seeded (>= 10 questions), skip
    const { count } = await a
      .from('org_questions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ ok:true, skipped:true });
    }

    // Default 15 placeholders (you can overwrite labels later)
    const base = Array.from({ length: 15 }).map((_, i) => ({
      org_id: orgId,
      label: `Base question ${i+1}`,
      kind: 'scale',
      options: [{ min: 1, max: 5 }],  // Likert 1-5 as a hint
      weight: 1,
      is_segmentation: false,
      active: true,
      display_order: i + 1
    }));

    const { error } = await a.from('org_questions').insert(base);
    if (error) throw error;

    // Add two example segmentation questions
    const seg = [
      {
        org_id: orgId,
        label: 'What is your team size?',
        kind: 'single',
        options: ['1-5','6-10','11-25','26+'],
        weight: 0,
        is_segmentation: true,
        active: true,
        display_order: 100
      },
      {
        org_id: orgId,
        label: 'Which department best fits your role?',
        kind: 'single',
        options: ['Sales','Marketing','Product','Engineering','Ops'],
        weight: 0,
        is_segmentation: true,
        active: true,
        display_order: 101
      }
    ];
    await a.from('org_questions').insert(seg);

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: String(e?.message ?? e) }, { status:500 });
  }
}
