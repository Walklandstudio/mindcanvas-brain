// Minimal, API-only result page.
// Uses ONLY /api/public/test/[token]/report?tid=… response.
// No filesystem reads. No org “guessing”.

import Link from "next/link";
import { getBaseUrl } from "@/lib/server-url";

type AB = "A" | "B" | "C" | "D";

type ReportData = {
  taker?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    top_profile_code?: string | null;
    top_profile_name?: string | null;
  };
  // Preferred fields (as your API provided before this thread):
  percentages?: Record<AB, number>; // can be 0..1 or 0..100
  frequency_labels?: Record<string, string> | { code: AB; name: string }[];
  profile_labels?: { code: string; name: string }[];
  totals?: Record<string, number>; // often profile totals
  orgName?: string; // optional
  title?: string;  // optional page title from API
};

type ReportAPI = { ok: boolean; data: ReportData };

function normalizeFreqLabels(
  labels: ReportData["frequency_labels"]
): Record<AB, string> | null {
  if (!labels) return null;
  if (Array.isArray(labels)) {
    const m = Object.fromEntries(
      labels.map((x) => [String(x.code).toUpperCase(), String(x.name)])
    );
    return { A: m["A"], B: m["B"], C: m["C"], D: m["D"] } as Record<AB, string>;
  }
  const obj = labels as Record<string, string>;
  const A = obj["A"] || obj["a"];
  const B = obj["B"] || obj["b"];
  const C = obj["C"] || obj["c"];
  const D = obj["D"] || obj["d"];
  return A && B && C && D ? { A, B, C, D } : null;
}

function normalizePerc(p?: Record<AB, number>): Record<AB, number> | null {
  if (!p) return null;
  const norm = (v: number) => (v <= 1 ? Math.round(v * 100) : Math.round(v));
  return { A: norm(p.A || 0), B: norm(p.B || 0), C: norm(p.C || 0), D: norm(p.D || 0) };
}

function topProfileFromTotals(
  totals?: Record<string, number>,
  labels?: { code: string; name: string }[]
): { code: string; name: string } | null {
  if (!totals || !labels?.length) return null;
  const top = Object.entries(totals).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (!top) return null;
  const [key] = top;
  // key could already be a code or a name; try to resolve
  const byCode = labels.find((p) => p.code === key);
  if (byCode) return byCode;
  const byName = labels.find((p) => p.name === key);
  if (byName) return byName;
  // numeric "1" → "P1"
  if (/^\d+$/.test(key)) {
    const pcode = `P${key}`;
    const hit = labels.find((p) => p.code === pcode);
    if (hit) return hit;
  }
  return { code: key, name: key };
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
    { cache: "no-store" }
  );
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Result</h1>
        <p className="text-destructive mt-4">Could not load your result. Please refresh.</p>
      </div>
    );
  }

  const { data } = (await res.json()) as ReportAPI;

  const freqLabels = normalizeFreqLabels(data.frequency_labels);
  const perc = normalizePerc(data.percentages) || { A: 0, B: 0, C: 0, D: 0 };

  const profiles = Array.isArray(data.profile_labels) ? data.profile_labels : [];
  const apiTop =
    (data.taker?.top_profile_code && profiles.find(p => p.code === data.taker!.top_profile_code)) ||
    (data.taker?.top_profile_name && profiles.find(p => p.name === data.taker!.top_profile_name)) ||
    topProfileFromTotals(data.totals, profiles);

  // dominant frequency from percentages
  const domFreq =
    (Object.entries(perc) as [AB, number][])
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const title =
    data.title ||
    data.orgName ||
    "Result";

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">
          {data.taker?.first_name ?? ""} {data.taker?.last_name ?? ""}
        </p>
      </header>

      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-medium mb-2">Top profile</h2>
        <p className="text-2xl font-semibold">{apiTop?.name ?? "—"}</p>
        <p className="text-muted-foreground mt-1">
          Dominant frequency:{" "}
          {domFreq ? (freqLabels?.[domFreq] ?? `Frequency ${domFreq}`) : "—"}
        </p>
      </section>

      <section className="rounded-2xl border p-6">
        <h3 className="text-xl font-medium mb-4">Your frequency mix</h3>
        <Bar label={freqLabels?.A ?? "Frequency A"} value={perc.A} />
        <Bar label={freqLabels?.B ?? "Frequency B"} value={perc.B} />
        <Bar label={freqLabels?.C ?? "Frequency C"} value={perc.C} />
        <Bar label={freqLabels?.D ?? "Frequency D"} value={perc.D} />
        <p className="mt-3 text-sm text-muted-foreground">
          Percentages are supplied by the report service.
        </p>
      </section>

      {profiles.length > 0 && (
        <section className="rounded-2xl border p-6">
          <h3 className="text-xl font-medium mb-4">Your profile mix</h3>
          {profiles.map((p) => {
            // If your API also sends profile percentages, render them here.
            // Otherwise we skip bars to avoid guessing.
            const v = 0;
            return <Bar key={p.code} label={p.name} value={v} />;
          })}
        </section>
      )}

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

