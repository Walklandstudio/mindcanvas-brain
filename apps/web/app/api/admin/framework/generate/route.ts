import 'server-only';
import { NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../../_lib/org';

// Optional OpenAI assist (names only); keep hard-safe fallback
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type Seed = { name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };

function heuristicSeeds(goals: any): Seed[] {
  const industry = String(goals?.industry || '').toLowerCase();
  const sector   = String(goals?.sector || '').toLowerCase();

  // Very light heuristic adjusted by industry/sector
  const A = ['Visionary', 'Spark'];
  const B = sector.includes('b2c') || industry.includes('media') ? ['Connector','Storyteller'] : ['Connector','Nurturer'];
  const C = industry.includes('ops') || industry.includes('manufactur') ? ['Anchor','Operator'] : ['Anchor','Architect'];
  const D = industry.includes('saas') || industry.includes('finance') ? ['Analyst','Specialist'] : ['Analyst','Strategist'];

  return [
    { name: A[0], frequency:'A', ordinal:1 },
    { name: A[1], frequency:'A', ordinal:2 },
    { name: B[0], frequency:'B', ordinal:3 },
    { name: B[1], frequency:'B', ordinal:4 },
    { name: C[0], frequency:'C', ordinal:5 },
    { name: C[1], frequency:'C', ordinal:6 },
    { name: D[0], frequency:'D', ordinal:7 },
    { name: D[1], frequency:'D', ordinal:8 },
  ];
}

async function aiNamePass(seeds: Seed[], goals: any): Promise<Seed[]> {
  if (!OPENAI_API_KEY) return seeds;

  try {
    const prompt = `
You are branding 8 persona/profile names for a business assessment.
Keep each name 1–2 words. Do NOT change their frequency or ordinal.
Given the context, suggest refined names that feel professional and industry-aligned.

Context (industry, sector, goal): ${JSON.stringify({
  industry: goals?.industry ?? '',
  sector: goals?.sector ?? '',
  primaryGoal: goals?.primaryGoal ?? '',
})}

Current list:
${seeds.map(s => `#${s.ordinal} ${s.name} (freq ${s.frequency})`).join('\n')}

Return ONLY a JSON array of {name, frequency, ordinal} in the same order.
`.trim();

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6
      })
    });

    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(text) as Seed[];
    // Validate shape and fall back if anything off
    if (Array.isArray(parsed) && parsed.length === 8) {
      return parsed.map((s, i) => ({
        name: (s.name || seeds[i].name).slice(0, 40),
        frequency: (s.frequency as any) ?? seeds[i].frequency,
        ordinal: Number(s.ordinal ?? seeds[i].ordinal),
      }));
    }
    return seeds;
  } catch {
    return seeds;
  }
}

function autoCompat(profileIds: string[], freqById: Record<string, 'A'|'B'|'C'|'D'>) {
  // Simple symmetric matrix: A–D = 60, adjacent = 80, same = 0
  const score = (fa: string, fb: string) => {
    if (fa === fb) return 0;
    const order = ['A','B','C','D'];
    const da = order.indexOf(fa);
    const db = order.indexOf(fb);
    const dist = Math.abs(da - db);
    if (dist === 1) return 80;
    if (dist === 2) return 60;
    return 70; // wrap-around A<->D treated as mid
  };

  const pairs: { profile_a: string; profile_b: string; score: number }[] = [];
  for (let i = 0; i < profileIds.length; i++) {
    for (let j = i + 1; j < profileIds.length; j++) {
      const a = profileIds[i], b = profileIds[j];
      pairs.push({ profile_a: a, profile_b: b, score: score(freqById[a], freqById[b]) });
    }
  }
  return pairs;
}

export async function POST() {
  const svc = admin();
  const { orgId, frameworkId } = await getOwnerOrgAndFramework();

  // 1) Pull onboarding goals
  const { data: ob } = await svc.from('org_onboarding').select('goals').eq('org_id', orgId).single();

  // 2) Build seeds (heuristic, then optional AI pass)
  let seeds = heuristicSeeds(ob?.goals ?? {});
  seeds = await aiNamePass(seeds, ob?.goals ?? {});

  // 3) Replace profiles (clean slate)
  const del = await svc.from('org_profiles').delete().eq('org_id', orgId).eq('framework_id', frameworkId);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  const { data: inserted, error: insErr } = await svc
    .from('org_profiles')
    .insert(seeds.map(s => ({ org_id: orgId, framework_id: frameworkId, ...s })))
    .select('id, name, frequency, ordinal')
    .order('ordinal', { ascending: true });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // 4) Seed compatibility
  const ids = (inserted ?? []).map(p => p.id);
  const freqById: Record<string, 'A'|'B'|'C'|'D'> = {};
  (inserted ?? []).forEach(p => { freqById[p.id] = p.frequency; });

  // wipe and insert
  await svc.from('org_profile_compatibility').delete().eq('framework_id', frameworkId);
  const compatRows = autoCompat(ids, freqById).map(r => ({
    org_id: orgId,
    framework_id: frameworkId,
    profile_a: r.profile_a,
    profile_b: r.profile_b,
    score: r.score
  }));
  if (compatRows.length) {
    const { error: compatErr } = await svc.from('org_profile_compatibility').insert(compatRows);
    if (compatErr) return NextResponse.json({ error: compatErr.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: inserted ?? [] });
}
