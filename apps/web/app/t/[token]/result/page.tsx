// apps/web/app/t/[token]/result/page.tsx
import Link from "next/link";
import {
  buildLookups,
  coerceOrgSlug,
  loadFrameworkBySlug,
  type FrequencyCode,
} from "@/lib/frameworks";
import { getBaseUrl } from "@/lib/server-url";
import { computeBreakdowns } from "@/lib/result-math";

type ReportAPI = {
  ok: boolean;
  data: any; // shape varies per org; the math helper normalizes it
};

async function resolveOrgSlug(base: string, token: string, data: any) {
  let slug = coerceOrgSlug(data);
  if (slug && slug !== "competency-coach") return slug;
  const m = await fetch(`${base}/api/public/test/${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
  if (m && m.ok) {
    const meta = await m.json().catch(() => null);
    const dd = meta?.data ?? meta;
    const inferred = coerceOrgSlug(dd);
    if (inferred) return inferred;
  }
  return slug || "competency-coach";
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
  const data = payload.data ?? {};

  const orgSlug = await resolveOrgSlug(base, token, data);
  const fw = await loadFrameworkBySlug(orgSlug);
  const { freqByCode, profileByCode, profilePrimaryFreq, profileNameToCode } = buildLookups(fw);

  // Compute both breakdowns from whatever the API returned
  const { freqPercents, profilePercents, profileTotals } = computeBreakdowns(data, {
    freqByCode,
    profileByCode,
    profilePrimaryFreq,
    profileNameToCode,
  });

  // Top profile by totals (fallback to API-provided)
  let topProfileCode: string | null = data?.taker?.top_profile_code || null;
  if (!topProfileCode) {
    topProfileCode =
      (Object.entries(profileTotals || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] as string) ||
      null;
  }
  const topProfile = topProfileCode ? profileByCode.get(topProfileCode) : undefined;

  // Dominant frequency
  const topFreqCode = dominant(freqPercents as Record<FrequencyCode, number>) as FrequencyCode | undefined;
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

      {/* Frequency mix */}
      <section className="rounded-2xl border p-6">
        <h3 className="text-xl font-medium mb-4">Your frequency mix</h3>
        {(["A","B","C","D"] as FrequencyCode[]).map(code => {
          const f = freqByCode.get(code);
          const v = (freqPercents as any)[code] ?? 0;
          return <Bar key={code} label={f?.name ?? `Frequency ${code}`} value={v} />;
        })}
        <p className="mt-3 text-sm text-muted-foreground">
          Percentages are computed from your scores using this organisation’s framework.
        </p>
      </section>

      {/* Profile mix */}
      <section className="rounded-2xl border p-6">
        <h3 className="text-xl font-medium mb-4">Your profile mix</h3>
        {[...profileByCode.values()].map((p) => {
          const v = Math.max(0, Math.min(100, Number((profilePercents as any)[p.code] || 0)));
          return <Bar key={p.code} label={p.name} value={v} />;
        })}
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

