import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

/**
 * Base 15 questions from your document.
 * NOTE: We keep weights server-side only; the UI never reveals them.
 * If you want some questions to count more, change weight numbers here.
 */
const BASE_QUESTIONS: Array<{ label: string; weight: number; kind?: 'scale'|'text'|'single'|'multi'; options?: any; }> = [
  { label: '1. How do you prefer to tackle new tasks?', weight: 1 },
  { label: '2. Which statement describes you best in a team setting?', weight: 1 },
  { label: '3. When faced with a problem, how do you solve it?', weight: 1 },
  { label: '4. How do you prefer to communicate with your team?', weight: 1 },
  { label: '5. What motivates you most in your work?', weight: 1 },
  { label: '6. When things get stressful at work, how do you respond?', weight: 1 },
  { label: '7. How do you handle feedback?', weight: 1 },
  { label: '8. How do you recover after making a mistake?', weight: 1 },
  { label: '9. How do you feel after completing a big project?', weight: 1 },
  { label: '10. How do you approach learning new things?', weight: 1 },
  { label: '11. What type of work energizes you?', weight: 1 },
  { label: '12. How do you approach personal growth?', weight: 1 },
  { label: '13. How do you handle disagreements in a team?', weight: 1 },
  { label: '14. How do you prefer to work on a team?', weight: 1 },
  { label: '15. What frustrates you most in a team setting?', weight: 1 },
];

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

    const rows = BASE_QUESTIONS.map((q, i) => ({
      org_id: orgId,
      label: q.label,
      kind: q.kind ?? 'scale',
      options: q.options ?? [{ min: 1, max: 5 }], // Likert 1–5 hint; real scoring will use your answer maps
      weight: q.weight,                            // kept server-side; hidden in UI
      is_segmentation: false,
      active: true,
      display_order: i + 1,
    }));

    const { error } = await a.from('org_questions').insert(rows);
    if (error) throw error;

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message ?? e) }, { status:500 });
  }
}
