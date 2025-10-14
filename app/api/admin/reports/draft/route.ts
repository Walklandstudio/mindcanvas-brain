import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../../_lib/org';

export async function POST(req: Request) {
  const { profileId } = (await req.json()) as { profileId: string };
  if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });

  const svc = admin();
  const { orgId } = await getOwnerOrgAndFramework();

  const [{ data: p }, { data: ob }] = await Promise.all([
    svc.from('org_profiles').select('id,name,frequency').eq('id', profileId).single(),
    svc.from('org_onboarding').select('company,goals').eq('org_id', orgId).single(),
  ]);

  const profName = p?.name || 'Profile';
  const g = ob?.goals || {};
  const industry = g.industry || 'your industry';
  const primaryGoal = g.primaryGoal || 'clear outcomes';
  const audience = g.audience || 'your audience';

  const sections = {
    strengths: `${profName} excels in ${industry} contexts by driving ${primaryGoal}. They energize ${audience} and rapidly turn ambiguity into direction.`,
    challenges: `${profName} may over-index on speed and vision; introduce cadence, checklists, and partner roles to land execution.`,
    roles: `Best fit: Strategy, Innovation, Partnerships. Adjacent: GTM Architect, Product Discovery.`,
    guidance: `Align to a 90-day map. Convert ideas into pilot bets with clear owners and success metrics. Pair with detail-oriented collaborators.`,
    visibility: `Publish short memos, demo early prototypes, and socialize learning. Share before/after stories mapped to ${primaryGoal}.`,
  };

  return NextResponse.json({ sections });
}
