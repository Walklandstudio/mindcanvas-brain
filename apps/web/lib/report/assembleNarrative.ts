type Json = any;

export type ReportData = {
  org: {
    name: string;
    logo_url: string | null;
    tagline: string | null;
    disclaimer: string | null;
  };
  taker: {
    fullName: string;
    email: string | null;
    company: string | null;
    role_title: string | null;
    completed_at: string | null;
  };
  test: {
    name: string | null;
  };
  freqPct: Record<string, number>;
  profilePct: Record<string, number>;
};

function parseTotals(t: unknown): Record<string, number> {
  if (!t) return {};
  try {
    if (typeof t === "string") {
      const once = JSON.parse(t);
      if (typeof once === "string") return JSON.parse(once);
      return once as Record<string, number>;
    }
    return t as Record<string, number>;
  } catch {
    return {};
  }
}

function asPercentMap(values: Record<string, number>): Record<string, number> {
  const sum = Object.values(values).reduce((a, b) => a + (Number(b) || 0), 0);
  if (!sum) return Object.fromEntries(Object.keys(values).map((k) => [k, 0]));
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, Math.round(((Number(v) || 0) / sum) * 100)])
  );
}

export function assembleNarrative(raw: {
  org: any;
  taker: any;
  test: any;
  latestResult: { totals: Json | null; created_at: string } | null;
}): ReportData {
  const totals = parseTotals(raw.latestResult?.totals);

  const keys = Object.keys(totals);
  const isFreq = keys.length > 0 && keys.every((k) => ["A", "B", "C", "D"].includes(k.toUpperCase()));

  let freq: Record<string, number> = {};
  let prof: Record<string, number> = {};

  if (isFreq) {
    freq = Object.fromEntries(
      Object.entries(totals as Record<string, number>).map(([k, v]) => [k.toUpperCase(), Number(v) || 0])
    );
  } else {
    prof = Object.fromEntries(
      Object.entries(totals as Record<string, number>).map(([k, v]) => [String(k), Number(v) || 0])
    );
  }

  const fullName =
    [raw.taker?.first_name, raw.taker?.last_name].filter(Boolean).join(" ").trim() || "—";

  return {
    org: {
      name: raw.org?.name ?? "—",
      logo_url: raw.org?.logo_url ?? null,
      tagline: raw.org?.report_cover_tagline ?? null,
      disclaimer: raw.org?.report_disclaimer ?? null,
    },
    taker: {
      fullName,
      email: raw.taker?.email ?? null,
      company: raw.taker?.company ?? null,
      role_title: raw.taker?.role_title ?? null,
      completed_at: raw.latestResult?.created_at ?? null,
    },
    test: {
      name: raw.test?.name ?? null,
    },
    freqPct: asPercentMap(freq),
    profilePct: asPercentMap(prof),
  };
}
