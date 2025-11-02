// apps/web/app/api/public/test/[token]/result/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { loadFrameworkBySlug, buildLookups, coerceOrgSlug } from '@/lib/frameworks';

const AB_VALUES = ['A', 'B', 'C', 'D'] as const;
type AB = (typeof AB_VALUES)[number];
type TotalsAB = Partial<Record<AB, number>>;

function toPercentages(t: TotalsAB): Record<AB, number> {
  const sum: number = AB_VALUES.reduce((acc, key) => acc + (Number(t?.[key] ?? 0)), 0);
  const out = {} as Record<AB, number>;
  for (const key of AB_VALUES) {
    const v = Number(t?.[key] ?? 0);
    out[key] = sum > 0 ? v / sum : 0;
  }
  return out;
}

function topKey(t: TotalsAB): AB {
  let best: AB = 'A';
  let max = -Infinity;
  for (const key of AB_VALUES) {
    const v = Number(t?.[key] ?? 0);
    if (v > max) {
      max = v;
      best = key;
    }
  }
  return best;
}

/**
 * Spreadsheet-style extras:
 * - frequency_scores: 0..10 relative to max frequency (rounded)
 * - frequency_calc: secondary % series (defaults to frequency_percentages)
 */
function computeFrequencyDerivatives(
  freqTotals: TotalsAB,
  freqPct: Record<AB, number>
) {
  const maxVal =
    Math.max(0, ...AB_VALUES.map((k) => Number(freqTotals?.[k] ?? 0))) || 1;

  const scores: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
  const calc: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };

  for (const k of AB_VALUES) {
    const raw = Number(freqTotals?.[k] ?? 0);
    const score0to10 = Math.round((raw / maxVal) * 10); // e.g., 5/3/6/8
    scores[k] = score0to10;

    // “Instinct Calc” default → same as percentages (tweak here if needed)
    calc[k] = Number(freqPct[k] ?? 0);
  }

  return { scores, calc };
}

export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
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
    // soft-fail; we’ll fall back to JSON framework if needed
  }

  // 2) Load frequency totals (results → submissions fallback)
  let frequencyTotals: TotalsAB = { A: 0, B: 0, C: 0, D: 0 };
  try {
    const { data: resRow } = await sb
      .from('portal.test_results')
      .select('totals')
      .eq('taker_id', tid)
      .limit(1)
      .maybeSingle();

    if (resRow?.totals && typeof resRow.totals === 'object') {
      const t = resRow.totals as Record<string, number>;
      frequencyTotals = {
        A: Number(t.A ?? 0),
        B: Number(t.B ?? 0),
        C: Number(t.C ?? 0),
        D: Number(t.D ?? 0),
      };
    } else {
      const { data: subRow } = await sb
        .from('portal.test_submissions')
        .select('totals')
        .eq('taker_id', tid)
        .limit(1)
        .maybeSingle();
      if (subRow?.totals && typeof subRow.totals === 'object') {
        const t = subRow.totals as Record<string, number>;
        frequencyTotals = {
          A: Number(t.A ?? 0),
          B: Number(t.B ?? 0),
          C: Number(t.C ?? 0),
          D: Number(t.D ?? 0),
        };
      }
    }
  } catch {
    // keep zeros
  }

  // 3) Labels: DB first, then framework JSON fallback (per-org)
  let frequencyLabels: { code: AB; name: string }[] = AB_VALUES.map((c) => ({ code: c, name: `Frequency ${c}` }));
  let profileLabels: { code: string; name: string }[] = Array.from({ length: 8 }).map((_, i) => ({
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
        frequencyLabels = AB_VALUES.map((c) => ({
          code: c,
          name: map.get(c) || `Frequency ${c}`,
        }));
      }
    } catch { /* noop */ }

    try {
      const { data: pl } = await sb
        .from('portal.test_profile_labels')
        .select('profile_code, profile_name')
        .eq('test_id', testId);

      if (Array.isArray(pl) && pl.length) {
        profileLabels = pl.map((r: any) => ({
          code: String(r.profile_code || '').trim() || 'PROFILE_1',
          name: String(r.profile_name || '').trim() || 'Profile',
        }));
      } else {
        throw new Error('no-profile-table-or-empty');
      }
    } catch {
      // Fallback to JSON framework
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
      }));

      if (!testName) testName = fw.framework.name || 'Profile Test';
      if (!orgSlug) orgSlug = slug;
    }
  } else {
    // No testId → still fall back to JSON framework
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
    }));
    if (!testName) testName = fw.framework.name || 'Profile Test';
    if (!orgSlug) orgSlug = slug;
  }

  // Existing normalization
  const frequency_percentages = toPercentages(frequencyTotals);
  const top_freq = topKey(frequencyTotals);

  // NEW: spreadsheet-style extras (Instinct ≙ Frequency)
  const { scores: frequency_scores, calc: frequency_calc } =
    computeFrequencyDerivatives(frequencyTotals, frequency_percentages);

  // Placeholders for profile mix unless you also persist per-profile totals
  const profile_totals: Record<string, number> = {};
  const profile_percentages: Record<string, number> = {};
  const top_profile_code = profileLabels[0]?.code || 'PROFILE_1';
  const top_profile_name = profileLabels[0]?.name || 'Top Profile';

  return NextResponse.json({
    ok: true,
    data: {
      org_slug: orgSlug || 'competency-coach',
      test_name: testName || 'Profile Test',
      taker: { id: tid },

      // Frequency (Instinct)
      frequency_labels: frequencyLabels,
      frequency_totals: {
        A: frequencyTotals.A ?? 0,
        B: frequencyTotals.B ?? 0,
        C: frequencyTotals.C ?? 0,
        D: frequencyTotals.D ?? 0,
      },
      frequency_percentages,
      frequency_scores,     // 0..10 scale
      frequency_calc,       // secondary % series (same as percentages by default)

      // Profile
      profile_labels: profileLabels,
      profile_totals,
      profile_percentages,

      top_freq,
      top_profile_code,
      top_profile_name,
      version: 'portal-v1',
    },
  });
}
