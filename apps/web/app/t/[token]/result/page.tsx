// apps/web/app/t/[token]/result/page.tsx
import Link from "next/link";
import {
  buildLookups,
  coerceOrgSlug,
  loadFrameworkBySlug,
  type FrequencyCode,
} from "@/lib/frameworks";
import getBaseUrl from "@/lib/server-url";

type ReportAPI = {
  ok: boolean;
  data: {
    orgSlug?: string;
    org_slug?: string;
    org?: { slug?: string } | string;
    taker?: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      top_profile_code?: string | null;
    };
    totals: Record<string, number>;
    percentages?: Record<FrequencyCode, number>;
  };
};

function sumProfileTotalsToFrequency(
  profileTotals: Record<string, number>,
  nameToCode: Map<string, string>,
  profilePrimaryFreq: Map<string, FrequencyCode>,
) {
  const freqTotals: Record<FrequencyCode, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const [key, raw] of Object.entries(profileTotals || {})) {
    const points = Number(raw || 0);
    if (!points) continue;
    let code = key;
    if (!profilePrimaryFreq.has(code)) {
      const maybe = nameToCode.get(key);
      if (maybe) code = maybe;
    }
    const f = profilePrimaryFreq.get(code);
    if (f) freqTotals[f] += points;
  }
  return freqTotals;
}

function toPercents(freqTotals: Record<FrequencyCode, number>) {
  const sum = (freqTotals.A + freqTotals.B + freqTotals.C + freqTotals.D) || 0;
  const pct = (n: number) => (sum === 0 ? 0 : Math.round((n / sum) * 100));
  return { A: pct(freqTotals.A), B: pct(freqTotals.B), C: pct(freqTotals.C), D: pct(freqTotals.D) };
}

function dominant<K extends string>(map: Record<K, number>) {
  return (Object.entries(map) as [K, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const token = params.token;
  const tid = searchParams?.tid || "";

  const base = await getBaseUrl();
  const res = await fetch(
    `${base}/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(tid)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Result</h1>
        <p className="text-destructive mt-4">Could not load your result. Please refresh.</p>
      </div>
    );
  }

  const payload = (await res.json()) as ReportAPI;
  const data = payload.data;

  const orgSlug = coerceOrgSlug(data);
  const fw = await loadFrameworkBySlug(orgSlug);
  const { freqByCode, profileByCode, profilePrimaryFreq, profileNameToCode } = buildLookups(fw);

  let perc: Record<FrequencyCode, number>;
  if (data.percentages) {
    const norm = (v: number) => (v <= 1 ? Math.round(v * 100) : Math.round(v));
    perc = {
      A: norm(data.percentages.A || 0),
      B: norm(data.percentages.B || 0),
      C: norm(data.percentages.C || 0),
      D: norm(data.percentages.D || 0),
    };
  } else {
    const freqTotals = sumProfileTotalsToFrequency(
      data.totals || {},
      profileNameToCode,
      profilePrimaryFreq,
    );
    perc = toPercents(freqTotals);
  }

  let topProfileCode = data.taker?.top_profile_code || null;
  if (!topProfileCode) {
    topProfileCode =
      Object.entries(data.totals || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ||
      null;
    if (topProfileCode && !profileByCode.has(topProfileCode)) {
      const maybe = profileNameToCode.get(topProfileCode);
      if (maybe) topProfileCode = maybe;
    }
  }
  const topProfile = topProfileCode ? profileByCode.get(topProfileCode) : undefined;

  const topFreqCode = dominant(perc as Record<FrequencyCode, number>) as FrequencyCode | undefined;
  const topFreq = topFreqCode ? freqByCode.get(topFreqCode) : undefined;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">{fw.framework.name}</h1>
        <p className="text-muted-foreground">
          {data.taker?.first_name ?? ""} {data.taker?.last_name ?? ""}
        </p>
      </header>

      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-medium mb-2">Top profile</h2>
        <p className="text-2xl font-semibold">{topProfile?.name ?? "—"}</p>
        <p className="text-muted-foreground mt-1">
          Dominant frequency: {topFreq ? topFreq.name : "—"}
        </p>
      </section>

      <section className="rounded-2xl border p-6">
        <h3 className="text-xl font-medium mb-4">Your frequency mix</h3>
        <Bar label="Frequency A" value={perc.A} />
        <Bar label="Frequency B" value={perc.B} />
        <Bar label="Frequency C" value={perc.C} />
        <Bar label="Frequency D" value={perc.D} />
        <p className="mt-3 text-sm text-muted-foreground">
          Percentages are computed from your scores using this organisation’s framework.
        </p>
      </section>

      <div className="flex justify-end">
        <Link
          href={`/t/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(tid)}`}
          className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          View your personalised report
        </Link>
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span>{v}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className="h-2 rounded-full bg-foreground/80" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

