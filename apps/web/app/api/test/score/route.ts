import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Answer = { question_id: string; option_index: 1|2|3|4 };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { orgId, frameworkId, answers } = body as {
    orgId: string; frameworkId: string; answers: Answer[];
  };

  if (!orgId || !frameworkId || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'orgId, frameworkId and answers required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // service role or use RLS + user JWT with row checks
  );

  // Fetch questions + weights for those ids
  const ids = answers.map(a => a.question_id);
  const { data, error } = await supabase
    .from('org_questions')
    .select('id, weights')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map id -> weights
  const byId = new Map<string, any>();
  for (const row of data ?? []) byId.set(row.id, row.weights);

  const freq: Record<'A'|'B'|'C'|'D', number> = { A:0, B:0, C:0, D:0 };
  const prof: Record<number, number> = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0 };

  for (const a of answers) {
    const w = byId.get(a.question_id);
    if (!w || !Array.isArray(w)) continue;
    const idx = a.option_index - 1; // 0..3
    const pick = w[idx];
    if (!pick) continue;
    const points = Number(pick.points) || 0;
    const profile = Number(pick.profile) as 1|2|3|4|5|6|7|8;
    const frequency = String(pick.frequency) as 'A'|'B'|'C'|'D';

    prof[profile] = (prof[profile] ?? 0) + points;
    freq[frequency] = (freq[frequency] ?? 0) + points;
  }

  // Determine top profile & frequency
  const topProfile = (Object.entries(prof) as [string,number][])
    .sort((a,b) => b[1]-a[1])[0];
  const topFrequency = (Object.entries(freq) as [string,number][])
    .sort((a,b) => b[1]-a[1])[0];

  const result = {
    frequencyTotals: freq,
    profileTotals: prof,
    topProfile: { profile: Number(topProfile[0]), points: topProfile[1] },
    topFrequency: { frequency: topFrequency[0] as 'A'|'B'|'C'|'D', points: topFrequency[1] },
  };

  return NextResponse.json(result);
}

