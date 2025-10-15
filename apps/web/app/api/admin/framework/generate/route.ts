import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { suggestFrameworkNames, buildProfileCopy } from '../../../../../app/_lib/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

async function getOrgId() {
  const c = await cookies();
  return c.get('mc_org_id')?.value ?? '00000000-0000-0000-0000-000000000001';
}

export async function POST() {
  const orgId = await getOrgId();
  const sb = svc();

  // Pull onboarding
  const ob = await sb.from('org_onboarding').select('data').eq('org_id', orgId).maybeSingle();
  if (ob.error) return NextResponse.json({ error: ob.error.message }, { status: 500 });

  const company = ob.data?.data?.company ?? {};
  const branding = ob.data?.data?.branding ?? {};
  const goals = ob.data?.data?.goals ?? {};
  const industry = company?.industry || goals?.industry || '';
  const sector   = company?.sector   || goals?.sector   || '';
  const brandTone = branding?.tone || branding?.brandTone || 'confident, modern, human';

  // Ensure framework row exists *with a name* (fix NOT NULL issue)
  const defaultName = 'Signature Profile Framework';
  const fwEx = await sb.from('org_frameworks').select('id,name,frequency_meta').eq('org_id', orgId).limit(1).maybeSingle();

  let frameworkId = fwEx.data?.id as string | undefined;
  if (!frameworkId) {
    const ins = await sb
      .from('org_frameworks')
      .insert([{ org_id: orgId, name: defaultName, frequency_meta: {} }])
      .select('id')
      .maybeSingle();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    frameworkId = ins.data!.id;
  } else if (!fwEx.data?.name) {
    await sb.from('org_frameworks').update({ name: defaultName }).eq('id', frameworkId).eq('org_id', orgId);
  }

  // Get names from AI (with internal fallbacks)
  const names = await suggestFrameworkNames({
    industry, sector, brandTone, primaryGoal: goals?.primaryGoal || goals?.goal || ''
  });

  // Save frequency labels
  await sb.from('org_frameworks')
    .update({ frequency_meta: {
      A: { name: names.frequencies.A },
      B: { name: names.frequencies.B },
      C: { name: names.frequencies.C },
      D: { name: names.frequencies.D },
    }})
    .eq('id', frameworkId)
    .eq('org_id', orgId);

  // Replace profiles A–D × 2
  await sb.from('org_profiles').delete().eq('org_id', orgId).eq('framework_id', frameworkId);

  const toInsert: any[] = [];
  const freqOrder: ('A'|'B'|'C'|'D')[] = ['A','A','B','B','C','C','D','D'];
  for (let i = 0; i < 8; i++) {
    const p = names.profiles[i];
    const freq = p?.frequency as 'A'|'B'|'C'|'D' || freqOrder[i];
    const name = (p?.name as string) || `Profile ${i+1}`;

    const copy = await buildProfileCopy({
      brandTone,
      industry,
      sector,
      company: company?.website || 'Demo Org',
      frequencyName: names.frequencies[freq],
      profileName: name,
    });

    toInsert.push({
      org_id: orgId,
      framework_id: frameworkId,
      name,
      frequency: freq,
      ordinal: i + 1,
      summary: copy.summary,
      image_url: null,
    });
  }

  const insProfiles = await sb.from('org_profiles').insert(toInsert).select('id');
  if (insProfiles.error) return NextResponse.json({ error: insProfiles.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, frameworkId, count: toInsert.length });
}
