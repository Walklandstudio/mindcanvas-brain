// apps/web/app/api/public/test/[token]/result/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { loadFrameworkBySlug, buildLookups, coerceOrgSlug } from '@/lib/frameworks';

const AB_VALUES = ['A', 'B', 'C', 'D'] as const;
type AB = (typeof AB_VALUES)[number];
type TotalsAB = Partial<Record<AB, number>>;

function toPercentages(t: TotalsAB): Record<AB, number> {
  const sum = AB_VALUES.reduce((acc, k) => acc + Number(t?.[k] ?? 0), 0);
  const out = {} as Record<AB, number>;
  for (const k of AB_VALUES) {
    const v = Number(t?.[k] ?? 0);
    out[k] = sum > 0 ? v / sum : 0;
  }
  return out;
}
function sumAB(t: TotalsAB) {
  return AB_VALUES.reduce((acc, k) => acc + Number(t?.[k] ?? 0), 0);
}
function normalizeFreqTotals(input: any): TotalsAB {
  if (!input || typeof input !== 'object') return { A: 0, B: 0, C: 0, D: 0 };
  // support both shapes:
  // flat: {A,B,C,D}
  // nested: {frequencies:{A,B,C,D}, profiles:{...}}
  const t = input.frequencies && typeof input.frequencies === 'object' ? input.frequencies : input;
  return {
    A: Number(t?.A ?? 0),
    B: Number(t?.B ?? 0),
    C: Number(t?.C ?? 0),
    D: Number(t?.D ?? 0),
  };
}
function normalizeProfileTotals(input: any): Record<string, number> {
  if (!input || typeof input !== 'object') return {};
  if (input.profiles && typeof input.profiles === 'object') {
    return Object.fromEntries(
      Object.entries(input.profiles).map(([k, v]) => [k, Number(v as any || 0)])
    );
  }
  return {};
}
function zeroTotals(freq: TotalsAB, prof: Record<string, number>) {
  const sf = sumAB(freq);
  const sp = Object.values(prof).reduce((a, b) => a + Number(b || 0), 0);
  return sf === 0 && sp === 0;
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const url = new URL(req.url);
  const token = params.token;
  const tid = url.searchParams.get('tid');

  if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
  if (!tid)   return NextResponse.json({ ok: false, error: 'Missing taker id (?tid=)' }, { status: 400 });

  const sb = getServerSupabase();

  // 1) Resolve link → test_id (+ org metadata if available)
  let testId: string | null = null;
  let orgSlug: string | null = null;
  let testName: string | null = null;

  try {
    const { data: link } = await sb
      .from('portal.test_links')
      .select('test_id, org_id')
      .eq('token', token)
      .limit(1)
      .maybeSingle();

    if (link?.test_id) testId = link.test_id;

    if (testId) {
      const { data: vt } = await sb
        .from('portal.v_org_tests')
        .select('org_slug, test_name')
        .eq('test_id', testId)
        .limit(1)
        .maybeSingle();
      if (vt?.org_slug) orgSlug = vt.org_slug as string;
      if (vt?.test_name) testName = vt.test_name as string;
    }

    if (!orgSlug && link?.org_id) {
      const { data: org } = await sb
        .from('portal.organizations')
        .select('slug')
        .eq('id', link.org_id)
        .limit(1)
        .maybeSingle();
      if (org?.slug) orgSlug = org.slug as string;
    }
  } catch {
    // soft-fail; will use JSON framework fallback below
  }

  // 2) Load totals (prefer results → latest submission)
  let rawTotals: any = null;
  let rawAnswers: Array<{ question_id: string; value: number }> = [];

  try {
    const r1 = await sb
      .from('portal.test_results')
      .select('totals')
      .eq('taker_id', tid)
      .limit(1)
      .maybeSingle();
    rawTotals = r1.data?.totals ?? null;

    if (!rawTotals) {
      const r2 = await sb
        .from('portal.test_submissions')
        .select('totals, raw_answers, answers_json')
        .eq('taker_id', tid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      rawTotals = r2.data?.totals ?? null;

      // collect answers for potential recompute
      const ra = Array.isArray(r2.data?.raw_answers) ? r2.data?.raw_answers
                : Array.isArray(r2.data?.answers_json) ? r2.data?.answers_json
                : [];
      rawAnswers = ra.map((a: any) => ({
        question_id: String(a?.question_id ?? a?.id ?? ''),
        value: Number(a?.value ?? a?.selected ?? a?.selected_index ?? a?.index ?? 0),
      })).filter(x => x.question_id);
    }
  } catch {
    // keep null; recompute path handles
  }

  let frequencyTotals = normalizeFreqTotals(rawTotals);
  let profileTotals   = normalizeProfileTotals(rawTotals);

  // 3) Labels: DB first, then framework JSON fallback (per-org)
  let frequencyLabels: { code: AB; name: string }[] = AB_VALUES.map((c) => ({ code: c, name: `Frequency ${c}` }));
  let profileLabels: { code: string; name: string; frequency?: AB | null }[] = Array.from({ length: 8 }).map((_, i) => ({
    code: `PROFILE_${i + 1}`,
    name: `Profile ${i + 1}`,
  }));

  if (testId) {
    try {
      const { data: fl } = await sb
        .from('portal.test_frequency_labels')
        .select('frequency_code, frequency_name')
        .eq('test_id', testId);
      if (Array.isArray(fl) && fl.length) {
        const map = new Map<string, string>();
        for (const r of fl) {
          const c = String(r.frequency_code || '').toUpperCase();
          const n = String(r.frequency_name || '').trim();
          if (AB_VALUES.includes(c as AB) && n) map.set(c, n);
        }
        frequencyLabels = AB_VALUES.map((c) => ({ code: c, name: map.get(c) || `Frequency ${c}` }));
      }
    } catch { /* noop */ }

    try {
      const { data: pl } = await sb
        .from('portal.test_profile_labels') // ✅ correct table
        .select('profile_code, profile_name, frequency_code')
        .eq('test_id', testId);

      if (Array.isArray(pl) && pl.length) {
        profileLabels = pl.map((r: any) => ({
          code: String(r.profile_code || '').trim() || 'PROFILE_1',
          name: String(r.profile_name || '').trim() || 'Profile',
          frequency: (String(r.frequency_code || '').trim().toUpperCase() as AB) || null,
        }));
      } else {
        throw new Error('empty');
      }
    } catch {
      // Fallback to JSON framework by org slug (or default)
      const slug = coerceOrgSlug({ org_slug: orgSlug });
      const fw = await loadFrameworkBySlug(slug);
      const lookups = buildLookups(fw);

      frequencyLabels = AB_VALUES.map((c) => ({
        code: c,
        name: lookups.freqByCode.get(c)?.name || `Frequency ${c}`,
      }));
      profileLabels = fw.framework.profiles.map((p) => ({
        code: String(p.code || '').trim() || 'PROFILE_1',
        name: String(p.name || '').trim() || String(p.code || 'Profile'),
        // ⬇️ use profilePrimaryFreq from lookups instead of non-existent profileToFreq
        frequency: (lookups.profilePrimaryFreq.get(String(p.code || '').trim()) as AB) ?? null,
      }));

      if (!testName) testName = fw.framework.name || 'Profile Test';
      if (!orgSlug)  orgSlug  = slug;
    }
  } else {
    // No testId → fallback to JSON framework
    const slug = coerceOrgSlug({ org_slug: orgSlug });
    const fw = await loadFrameworkBySlug(slug);
    const lookups = buildLookups(fw);
    frequencyLabels = AB_VALUES.map((c) => ({ code: c, name: lookups.freqByCode.get(c)?.name || `Frequency ${c}` }));
    profileLabels = fw.framework.profiles.map((p) => ({
      code: String(p.code || '').trim() || 'PROFILE_1',
      name: String(p.name || '').trim() || String(p.code || 'Profile'),
      frequency: (lookups.profilePrimaryFreq.get(String(p.code || '').trim()) as AB) ?? null,
    }));
    if (!testName) testName = fw.framework.name || 'Profile Test';
    if (!orgSlug)  orgSlug  = slug;
  }

  // 4) Recompute if needed (missing/zero totals and we have answers)
  if (testId && zeroTotals(frequencyTotals, profileTotals) && rawAnswers.length > 0) {
    // Build lookups for recompute
    const nameToCode = new Map<string, string>();
    const codeToFreq = new Map<string, AB>();
    for (const p of profileLabels) {
      if (p.name && p.code) nameToCode.set(p.name, p.code);
      if (p.code && p.frequency) codeToFreq.set(p.code, p.frequency);
    }

    const { data: qs } = await sb
      .from('portal.test_questions')
      .select('id, profile_map')
      .eq('test_id', testId);

    const mapByQ = new Map<string, Array<{ profile: string; points: number }>>();
    for (const r of qs || []) {
      const a = Array.isArray((r as any).profile_map) ? (r as any).profile_map : [];
      mapByQ.set(
        r.id,
        a.map((x: any) => ({
          profile: String(x?.profile ?? '').trim(),
          points: Number(x?.points ?? 0),
        }))
      );
    }

    const freqTotals: TotalsAB = { A: 0, B: 0, C: 0, D: 0 };
    const profTotals: Record<string, number> = {};

    for (const { question_id, value } of rawAnswers) {
      const map = mapByQ.get(question_id);
      if (!map || map.length === 0) continue;
      const idx = Math.max(1, Math.min(Number(value) || 0, map.length)) - 1;
      const entry = map[idx];
      if (!entry) continue;

      let pcode = entry.profile;
      // allow profile names → codes
      if (pcode && !/^P(?:ROFILE)?[_\s-]?\d+$/i.test(pcode)) {
        const byName = nameToCode.get(pcode);
        if (byName) pcode = byName;
      }
      if (!pcode) continue;

      const pts = Number(entry.points || 0);
      profTotals[pcode] = (profTotals[pcode] || 0) + pts;

      const f = codeToFreq.get(pcode);
      if (f) freqTotals[f] = Number(freqTotals[f] || 0) + pts;
    }

    frequencyTotals = {
      A: Number(freqTotals.A || 0),
      B: Number(freqTotals.B || 0),
      C: Number(freqTotals.C || 0),
      D: Number(freqTotals.D || 0),
    };
    profileTotals = profTotals;

    // Persist so next call is fast (use nested totals)
    await sb
      .from('portal.test_results')
      .upsert({ taker_id: tid, totals: { frequencies: frequencyTotals, profiles: profileTotals } }, { onConflict: 'taker_id' });
  }

  // 5) Build response
  const freqPct = toPercentages(frequencyTotals);
  const topFreq = (Object.entries(frequencyTotals).sort((a,b)=> Number(b[1]||0)-Number(a[1]||0))[0]?.[0] as AB) || 'A';

  // profile percentages
  const pSum = Object.values(profileTotals).reduce((a,b)=> a + Number(b||0), 0);
  const profilePercentages: Record<string, number> = {};
  if (pSum > 0) {
    for (const [k,v] of Object.entries(profileTotals)) profilePercentages[k] = Number(v||0) / pSum;
  }

  let topProfileCode = Object.entries(profileTotals).sort((a,b)=> Number(b[1]||0)-Number(a[1]||0))[0]?.[0] || profileLabels[0]?.code || 'PROFILE_1';
  let topProfileName = profileLabels.find(p => p.code === topProfileCode)?.name || profileLabels[0]?.name || 'Top Profile';

  return NextResponse.json({
    ok: true,
    data: {
      org_slug: orgSlug || 'competency-coach',
      test_name: testName || 'Profile Test',
      taker: { id: tid },

      // Frequencies
      frequency_labels: frequencyLabels,
      frequency_totals: {
        A: Number(frequencyTotals.A || 0),
        B: Number(frequencyTotals.B || 0),
        C: Number(frequencyTotals.C || 0),
        D: Number(frequencyTotals.D || 0),
      },
      frequency_percentages: {
        A: Number(freqPct.A || 0),
        B: Number(freqPct.B || 0),
        C: Number(freqPct.C || 0),
        D: Number(freqPct.D || 0),
      },

      // Profiles
      profile_labels: profileLabels.map(p => ({ code: p.code, name: p.name })),
      profile_totals: profileTotals,
      profile_percentages: profilePercentages,

      top_freq: topFreq,
      top_profile_code: topProfileCode,
      top_profile_name: topProfileName,
      version: 'portal-v1',
    },
  });
}
