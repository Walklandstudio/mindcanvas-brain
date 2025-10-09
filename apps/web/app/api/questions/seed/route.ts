import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

// NOTE: options are labels only to avoid exposing weights.
// Scoring weights live server-side (see /api/test/_lib/scoring.ts).
const BASE_QUESTIONS = [
  {
    label: '1. How do you prefer to tackle new tasks?',
    kind: 'single',
    options: ['I dive right in','I make a detailed plan','I like to brainstorm with others','I follow a structured process'],
  },
  {
    label: '2. Which statement describes you best in a team setting?',
    kind: 'single',
    options: ['I take charge and lead','Keep tasks on track','Build positive environment','Focus on details'],
  },
  {
    label: '3. When faced with a problem, how do you best like to solve it?',
    kind: 'single',
    options: ['I like to try new ideas and adjust','I break it into clear steps','I research before acting','I like to collaborate for solutions'],
  },
  {
    label: '4. How do you prefer to communicate within a team?',
    kind: 'single',
    options: ['I am thoughtful and organised','I like to focus on facts','I am direct and to the point','I am friendly and supportive'],
  },
  {
    label: '5. What motivates you mostly in your work?',
    kind: 'single',
    options: ['I like new challenges','I like to help others succeed','Making sure things are running smoothly','I like to produce high quality'],
  },
  {
    label: '6. When things get stressful at work, how would you respond?',
    kind: 'single',
    options: ['I like to pause and plan','I like to stay organised','I like to reach out for support','I just like to push through'],
  },
  {
    label: '7. How do you generally handle feedback?',
    kind: 'single',
    options: ['I value fact-based feedback','I appreciate quick feedback','I focus on relationships and connection','I prefer to receive detailed feedback'],
  },
  {
    label: '8. How do you recover after making a mistake?',
    kind: 'single',
    options: ['I like to reflect and plan','I fix the mistake','I like to discuss with a colleague','I like to move on and adjust'],
  },
  {
    label: '9. How do you feel after completing a big project?',
    kind: 'single',
    options: ['I am relieved it went to plan','I am proud of the accuracy','I am grateful for team support','I am excited to get on with the next challenge'],
  },
  {
    label: '10. How do you best approach learning new things?',
    kind: 'single',
    options: ['I like to learn with others','I prefer structured learning','I like to experiment with concepts','I like a deep dive to fully understand'],
  },
  {
    label: '11. What type of work energises you?',
    kind: 'single',
    options: ['Innovative projects','Organising and building processes','Collaborating with others','Analysing data'],
  },
  {
    label: '12. How do you prefer to approach personal growth?',
    kind: 'single',
    options: ['I like to challenge myself','I like to refine my skills','I like to set specific goals','Through learning with others'],
  },
  {
    label: '13. How do you best handle disagreements?',
    kind: 'single',
    options: ['I like to assert my position','I like to seek middle ground','I look for logical solutions','I feel better to stay objective'],
  },
  {
    label: '14. How do you prefer to work on a team?',
    kind: 'single',
    options: ['I like to lead and make decisions','I prefer to foster team collaboration','I prefer to organise tasks','I provide analytical support'],
  },
  {
    label: '15. What frustrates you most in a team or social setting?',
    kind: 'single',
    options: ['Lack of clear goals','Slow decision-making','Lack of attention to detail','Conflict between members'],
  },
] as const;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

    const orgId = await orgIdFromAuth(auth);
    if (!orgId) return NextResponse.json({ ok:false, error:'no_org' }, { status:401 });

    const a = admin();

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
      kind: q.kind,
      options: q.options, // labels only
      weight: 1,          // hidden; scoring is server-side per choice map
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
