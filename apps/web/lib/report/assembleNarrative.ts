import type { ReportData } from '@/components/report/ReportShell';

export function assembleNarrative(raw: any): ReportData {
  const freqs = {
    A: Number(raw.results?.frequency_a ?? 0),
    B: Number(raw.results?.frequency_b ?? 0),
    C: Number(raw.results?.frequency_c ?? 0),
    D: Number(raw.results?.frequency_d ?? 0),
  };

  return {
    org: {
      name: raw.org?.name ?? 'Organisation',
      brand_name: raw.org?.brand_name,
      logo_url: raw.org?.logo_url,
      report_cover_tagline: raw.org?.report_cover_tagline,
    },
    taker: {
      first_name: raw.taker?.first_name,
      last_name: raw.taker?.last_name,
      email: raw.taker?.email,
      role: raw.taker?.role,
    },
    results: {
      frequencies: freqs,
      topProfile: {
        code: raw.results?.top_profile_code ?? 0,
        name: raw.results?.top_profile_name ?? 'Top Profile',
        desc: raw.results?.top_profile_desc ?? '',
      }
    },
    copy: {
      intro: null,
      disclaimer: raw.org?.report_disclaimer ?? null
    }
  };
}
