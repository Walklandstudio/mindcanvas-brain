// apps/web/lib/result-math.ts
import type { FrequencyCode } from "./frameworks";

export type Mix = Record<string, number>;
export type PercentMix = Record<string, number>;

export type Lookups = {
  // frequency code -> {code,name}
  freqByCode: Map<FrequencyCode, { code: FrequencyCode; name: string }>;
  // profile code -> {code,name,frequencies:[A|B|C|D,...]}
  profileByCode: Map<string, { code: string; name: string; frequencies: FrequencyCode[] }>;
  // profile code -> primary frequency code
  profilePrimaryFreq: Map<string, FrequencyCode>;
  // profile NAME (or slug) -> profile CODE
  profileNameToCode: Map<string, string>;
};

/** Case-insensitive compare helper */
function ci(s?: string) { return String(s || "").trim().toLowerCase(); }

/** Try to map any incoming key into a frequency code using framework labels. */
export function keyToFreqCode(
  key: string,
  lookups: Lookups,
): FrequencyCode | null {
  const k = ci(key);
  // 1) direct A/B/C/D
  if (["a","b","c","d"].includes(k)) return k.toUpperCase() as FrequencyCode;

  // 2) match by known frequency names (Innovation, Influence, Implementation, Insight … or Catalyst, …)
  for (const [code, f] of lookups.freqByCode.entries()) {
    if (ci(f.name) === k) return code;
  }
  return null;
}

/** Try to map any incoming key into a profile CODE using code or name. */
export function keyToProfileCode(
  key: string,
  lookups: Lookups,
): string | null {
  const kRaw = String(key || "").trim();
  const k = ci(kRaw);

  // direct code hit
  if (lookups.profileByCode.has(kRaw)) return kRaw;

  // “p1”, “P1”
  if (/^p\d+$/i.test(kRaw)) {
    const maybe = kRaw.toUpperCase();
    if (lookups.profileByCode.has(maybe)) return maybe;
  }

  // name/slug map
  const byName = lookups.profileNameToCode.get(kRaw) || lookups.profileNameToCode.get(k);
  if (byName) return byName;

  // numeric “1” -> “P1”
  if (/^\d+$/.test(kRaw)) {
    const asP = `P${kRaw}`;
    if (lookups.profileByCode.has(asP)) return asP;
  }
  return null;
}

/** Sum numbers in an object. */
function sum(obj: Record<string, number>) {
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** Convert to % out of 100 (rounded) */
function toPerc(obj: Record<string, number>): Record<string, number> {
  const s = sum(obj);
  const pct = (n: number) => (s <= 0 ? 0 : Math.round((n / s) * 100));
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, pct(Number(v) || 0)]));
}

/**
 * Compute BOTH mixes from whatever the API provides.
 * Accepts:
 *  - data.frequency_totals              (preferred)
 *  - data.profile_totals                (preferred)
 *  - data.totals (may be frequencies OR profiles OR a mix by names/codes)
 */
export function computeBreakdowns(
  data: any,
  lookups: Lookups,
): {
  freqTotals: Record<FrequencyCode, number>;
  freqPercents: Record<FrequencyCode, number>;
  profileTotals: Record<string, number>;
  profilePercents: Record<string, number>;
} {
  // initialize empty totals
  const freqTotals: Record<FrequencyCode, number> = { A: 0, B: 0, C: 0, D: 0 };
  const profileTotals: Record<string, number> = {};

  // 1) explicit buckets if present
  const freqInput: Record<string, number> = data?.frequency_totals || {};
  const profInput: Record<string, number> = data?.profile_totals || {};

  // fill from explicit frequency_totals
  for (const [k, v] of Object.entries(freqInput)) {
    const code = keyToFreqCode(k, lookups);
    if (code) freqTotals[code] += Number(v) || 0;
  }

  // fill from explicit profile_totals
  for (const [k, v] of Object.entries(profInput)) {
    const pcode = keyToProfileCode(k, lookups);
    if (!pcode) continue;
    profileTotals[pcode] = (profileTotals[pcode] || 0) + (Number(v) || 0);

    // also accumulate into freq via primary
    const f = lookups.profilePrimaryFreq.get(pcode);
    if (f) freqTotals[f] += Number(v) || 0;
  }

  // 2) fallback: data.totals (could be either kind)
  const totals: Record<string, number> = data?.totals || {};
  for (const [k, v] of Object.entries(totals)) {
    const num = Number(v) || 0;
    if (!num) continue;

    const f = keyToFreqCode(k, lookups);
    if (f) {
      freqTotals[f] += num;
      continue;
    }
    const pcode = keyToProfileCode(k, lookups);
    if (pcode) {
      profileTotals[pcode] = (profileTotals[pcode] || 0) + num;
      const pf = lookups.profilePrimaryFreq.get(pcode);
      if (pf) freqTotals[pf] += num;
    }
  }

  const freqPercents = toPerc(freqTotals);
  const profilePercents = toPerc(profileTotals);
  return { freqTotals, freqPercents, profileTotals, profilePercents };
}
