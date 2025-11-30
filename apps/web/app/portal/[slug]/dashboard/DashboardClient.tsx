"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Cell } from "recharts";

const ResponsiveContainer = dynamic(
  async () => (await import("recharts")).ResponsiveContainer,
  { ssr: false }
);
const BarChart = dynamic(async () => (await import("recharts")).BarChart, {
  ssr: false,
});
const Bar = dynamic(async () => (await import("recharts")).Bar, {
  ssr: false,
});
const XAxis = dynamic(async () => (await import("recharts")).XAxis, {
  ssr: false,
});
const YAxis = dynamic(async () => (await import("recharts")).YAxis, {
  ssr: false,
});
const Tooltip = dynamic(async () => (await import("recharts")).Tooltip, {
  ssr: false,
});
const CartesianGrid = dynamic(
  async () => (await import("recharts")).CartesianGrid,
  { ssr: false }
);
const LabelList = dynamic(
  async () => (await import("recharts")).LabelList,
  { ssr: false }
);
const PieChart = dynamic(async () => (await import("recharts")).PieChart, {
  ssr: false,
});
const Pie = dynamic(async () => (await import("recharts")).Pie, {
  ssr: false,
});

type KV = { key: string; value: number; percent?: string };
type Payload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

type TestSummary = {
  id: string;
  name: string;
  slug: string | null;
  is_default_dashboard?: boolean | null;
  status?: string | null;
};

type UsageSummary = {
  total_submissions: number;
  unique_tests: number;
  unique_links: number;
};

type UsageByTest = {
  test_id: string;
  test_name: string;
  test_slug: string | null;
  submissions: number;
  first_submission: string | null;
  last_submission: string | null;
};

type UsageByLink = {
  link_id: string | null;
  link_name: string | null;
  link_token: string | null;
  test_name: string | null;
  submissions: number;
  first_submission: string | null;
  last_submission: string | null;
};

type UsageActivityByDay = {
  date: string;
  submissions: number;
};

type UsagePayload = {
  summary: UsageSummary;
  byTest: UsageByTest[];
  byLink: UsageByLink[];
  activityByDay: UsageActivityByDay[];
};

const COLORS = {
  tileBg: "rgba(45,143,196,0.05)",
  primary: "#2d8fc4",
  accent: "#64bae2",
};

const FREQ_SEGMENT_COLORS = [
  "#64bae2",
  "#2d8fc4",
  "#0ea5e9",
  "#0369a1",
];

function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return;
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardClient() {
  const pathname = usePathname();
  const slug = useMemo(() => {
    const segs = (pathname || "").split("/").filter(Boolean);
    const i = segs.indexOf("portal");
    return i >= 0 && segs[i + 1] ? segs[i + 1] : "";
  }, [pathname]);

  // ---- dashboard aggregate state ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);

  // ---- tests list ----
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) || null,
    [tests, selectedTestId]
  );

  // ---- usage state ----
  type PeriodKey =
    | "all"
    | "this_week"
    | "last_week"
    | "this_month"
    | "last_month"
    | "this_year"
    | "last_year";

  const [period, setPeriod] = useState<PeriodKey>("all");
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);

  // ---- load tests (org tests list) ----
  useEffect(() => {
    if (!slug) return;
    let active = true;

    (async () => {
      try {
        setTestsLoading(true);
        setTestsError(null);

        const res = await fetch(
          `/api/portal-tests?org=${encodeURIComponent(slug)}`,
          { cache: "no-store" }
        );
        const json = await res.json();

        if (!active) return;

        if (!json?.ok) {
          setTestsError(json?.error || "Failed to load tests");
          setTests([]);
        } else {
          const list: TestSummary[] = json.tests ?? [];
          setTests(list);

          // auto-select default test if present
          const def =
            list.find((t) => t.is_default_dashboard) || list[0] || null;
          setSelectedTestId(def ? def.id : null);
        }
      } catch (e: any) {
        if (active) setTestsError(e?.message ?? "Failed to load tests");
      } finally {
        if (active) setTestsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  // ---- load core dashboard data (frequencies/profiles) ----
  useEffect(() => {
    if (!slug) return;
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("org", slug);
        if (selectedTestId) params.set("testId", selectedTestId);

        const res = await fetch(`/api/portal-dashboard?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!active) return;
        if (!json?.ok) setError(json?.error || "Unknown error");
        else setData(json.data as Payload);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Network error");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug, selectedTestId]);

  // ---- load usage / segmentation data ----
  useEffect(() => {
    if (!slug) return;
    let active = true;

    (async () => {
      setUsageLoading(true);
      setUsageError(null);
      try {
        const params = new URLSearchParams();
        params.set("org", slug);
        params.set("period", period);
        if (selectedTestId) params.set("testId", selectedTestId);

        const res = await fetch(`/api/portal-usage?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!active) return;
        if (!json?.ok) {
          setUsageError(json?.error || "Failed to load usage");
          setUsage(null);
        } else {
          setUsage(json.data as UsagePayload);
        }
      } catch (e: any) {
        if (active) setUsageError(e?.message ?? "Network error");
      } finally {
        if (active) setUsageLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug, selectedTestId, period]);

  const freq = data?.frequencies ?? [];
  const prof = data?.profiles ?? [];
  const top3 = data?.top3 ?? [];
  const bottom3 = data?.bottom3 ?? [];
  const overall = data?.overall;

  const freqChartData = useMemo(
    () =>
      freq.map((f) => ({
        name: f.key,
        percentNum: Number((f.percent || "0%").replace("%", "")),
      })),
    [freq]
  );

  const profChartData = useMemo(
    () =>
      prof.map((p) => ({
        name: p.key,
        percentNum: Number((p.percent || "0%").replace("%", "")),
      })),
    [prof]
  );

  const scopeLabel = useMemo(() => {
    if (!slug) return "—";
    if (!selectedTest) return slug;
    return `${slug} – ${selectedTest.name}`;
  }, [slug, selectedTest]);

  const csvSuffix = useMemo(() => {
    if (!slug && !selectedTest) return "all";
    if (slug && !selectedTest) return slug;
    if (slug && selectedTest?.slug) return `${slug}_${selectedTest.slug}`;
    if (slug && selectedTest) return `${slug}_${selectedTest.id}`;
    return selectedTest?.id ?? "all";
  }, [slug, selectedTest]);

  const usageSummary = usage?.summary;
  const usageByTest = usage?.byTest ?? [];
  const usageByLink = usage?.byLink ?? [];
  const usageActivity = usage?.activityByDay ?? [];

  const periodLabel = (p: PeriodKey): string => {
    switch (p) {
      case "this_week":
        return "This week";
      case "last_week":
        return "Last week";
      case "this_month":
        return "This month";
      case "last_month":
        return "Last month";
      case "this_year":
        return "This year";
      case "last_year":
        return "Last year";
      case "all":
      default:
        return "All time";
    }
  };

  return (
    <div className="space-y-8">
      {/* Description + filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Overview of frequency mix, profile distribution, and usage for your
            organisation.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            {/* Test selector */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Test:</span>
              <select
                className="min-w-[220px] rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
                value={selectedTestId ?? ""}
                onChange={(e) =>
                  setSelectedTestId(e.target.value || null)
                }
                disabled={testsLoading || !!testsError || !tests.length}
              >
                <option value="">
                  All tests {tests.length ? `(${tests.length})` : ""}
                </option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.slug ? ` — ${t.slug}` : ""}
                    {t.is_default_dashboard ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Time range selector */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Time range:</span>
              <select
                className="rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value as PeriodKey)
                }
              >
                <option value="all">All time</option>
                <option value="this_week">This week</option>
                <option value="last_week">Last week</option>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
                <option value="this_year">This year</option>
                <option value="last_year">Last year</option>
              </select>
            </div>

            {testsError && (
              <span className="text-xs text-red-400">
                {testsError}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="self-start rounded-xl border border-sky-500/70 bg-sky-600/80 px-4 py-2 text-sm font-medium text-white shadow-sm opacity-40"
          disabled
        >
          Manage Test (coming soon)
        </button>
      </div>

      {/* Top metric tiles (scores) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div
          className="rounded-2xl border border-white/10 p-4 shadow-sm"
          style={{ backgroundColor: COLORS.tileBg }}
        >
          <div className="mb-2 text-xs opacity-70">Overall Average</div>
          <div className="text-2xl font-semibold text-sky-400">
            {overall?.average ?? "—"}
          </div>
        </div>
        <div
          className="rounded-2xl border border-white/10 p-4 shadow-sm"
          style={{ backgroundColor: COLORS.tileBg }}
        >
          <div className="mb-2 text-xs opacity-70">Total Responses</div>
          <div className="text-2xl font-semibold text-sky-400">
            {overall?.count ?? "—"}
          </div>
        </div>
        <div
          className="rounded-2xl border border-white/10 p-4 shadow-sm"
          style={{ backgroundColor: COLORS.tileBg }}
        >
          <div className="mb-2 text-xs opacity-70">Scope</div>
          <div className="text-sm font-semibold text-sky-400">
            {scopeLabel}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm opacity-70">Loading score data…</div>
      )}
      {error && (
        <div className="text-sm text-red-400">Error: {error}</div>
      )}

      {/* Charts row (frequencies + profiles) */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Frequencies – donut */}
        <div className="rounded-2xl border border-white/10 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">
              Frequencies (% of total)
            </h2>
            <button
              className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 transition hover:bg-sky-500 hover:text-white"
              disabled={!freq.length}
              onClick={() =>
                downloadCSV(
                  `frequencies_${csvSuffix}.csv`,
                  freq.map((r) => ({
                    name: r.key,
                    value: r.value,
                    percent: r.percent ?? "",
                  }))
                )
              }
            >
              Download CSV
            </button>
          </div>

          <div className="flex h-60 w-full items-center gap-4">
            <div className="h-full w-1/2 min-w-[220px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={freqChartData}
                    dataKey="percentNum"
                    nameKey="name"
                    innerRadius="60%"
                    outerRadius="90%"
                    stroke="#0f172a"
                    strokeWidth={2}
                    fill={COLORS.accent}
                  >
                    {freqChartData.map((entry, index) => (
                      <Cell
                        key={`freq-slice-${entry.name}-${index}`}
                        fill={
                          FREQ_SEGMENT_COLORS[
                            index % FREQ_SEGMENT_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border:
                        "1px solid rgba(148,163,184,0.6)",
                      borderRadius: 8,
                      color: "#e5e7eb",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#e5e7eb" }}
                    formatter={((value: any) => [
                      `${value}%`,
                      "Share",
                    ]) as any}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1">
              <ul className="space-y-1 text-sm">
                {freqChartData.map((f, idx) => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            FREQ_SEGMENT_COLORS[
                              idx %
                                FREQ_SEGMENT_COLORS.length
                            ],
                        }}
                      />
                      <span>{f.name}</span>
                    </span>
                    <span className="font-medium">
                      {f.percentNum.toFixed(1)}%
                    </span>
                  </li>
                ))}
                {!freqChartData.length && (
                  <li className="text-xs text-slate-400">
                    No frequency data available yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Profiles – bar chart */}
        <div className="rounded-2xl border border-white/10 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">
              Profiles (% of total)
            </h2>
            <button
              className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 transition hover:bg-sky-500 hover:text-white"
              disabled={!prof.length}
              onClick={() =>
                downloadCSV(
                  `profiles_${csvSuffix}.csv`,
                  prof.map((r) => ({
                    name: r.key,
                    value: r.value,
                    percent: r.percent ?? "",
                  }))
                )
              }
            >
              Download CSV
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart
                data={profChartData}
                layout="vertical"
                margin={{
                  left: 80,
                  right: 32,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border:
                      "1px solid rgba(148,163,184,0.6)",
                    borderRadius: 8,
                    color: "#e5e7eb",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                  formatter={((value: any) =>
                    `${value}%`) as any}
                />
                <Bar
                  dataKey="percentNum"
                  radius={[6, 6, 6, 6]}
                  fill={COLORS.accent}
                >
                  <LabelList
                    dataKey="percentNum"
                    position="right"
                    className="fill-slate-100"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Top / Bottom 3 */}
      {(top3.length || bottom3.length) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            className="rounded-2xl border border-white/10 p-4 shadow-sm"
            style={{ backgroundColor: COLORS.tileBg }}
          >
            <h3 className="mb-2 text-base font-medium text-sky-300">
              Top 3 Profiles
            </h3>
            <ul className="space-y-1 text-sm">
              {top3.map((t) => (
                <li
                  key={t.key}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{t.key}</span>
                  <span className="font-semibold">
                    {t.percent ?? `${t.value}`}
                  </span>
                </li>
              ))}
              {!top3.length && (
                <li className="text-xs text-slate-400">
                  No profile data available yet.
                </li>
              )}
            </ul>
          </div>

          <div
            className="rounded-2xl border border-white/10 p-4 shadow-sm"
            style={{ backgroundColor: COLORS.tileBg }}
          >
            <h3 className="mb-2 text-base font-medium text-sky-300">
              Bottom 3 Profiles
            </h3>
            <ul className="space-y-1 text-sm">
              {bottom3.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{b.key}</span>
                  <span className="font-semibold">
                    {b.percent ?? `${b.value}`}
                  </span>
                </li>
              ))}
              {!bottom3.length && (
                <li className="text-xs text-slate-400">
                  No profile data available yet.
                </li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* Usage / segmentation section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-sky-300">
            Usage – {periodLabel(period)}
          </h2>
          {usageLoading && (
            <div className="text-xs text-slate-300">
              Loading usage…
            </div>
          )}
        </div>

        {usageError && (
          <div className="text-sm text-red-400">
            Error loading usage: {usageError}
          </div>
        )}

        {/* Summary usage tiles */}
        {usageSummary && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
              className="rounded-2xl border border-white/10 p-4 shadow-sm"
              style={{ backgroundColor: COLORS.tileBg }}
            >
              <div className="mb-2 text-xs opacity-70">
                Total submissions
              </div>
              <div className="text-2xl font-semibold text-sky-400">
                {usageSummary.total_submissions}
              </div>
            </div>
            <div
              className="rounded-2xl border border-white/10 p-4 shadow-sm"
              style={{ backgroundColor: COLORS.tileBg }}
            >
              <div className="mb-2 text-xs opacity-70">
                Tests with activity
              </div>
              <div className="text-2xl font-semibold text-sky-400">
                {usageSummary.unique_tests}
              </div>
            </div>
            <div
              className="rounded-2xl border border-white/10 p-4 shadow-sm"
              style={{ backgroundColor: COLORS.tileBg }}
            >
              <div className="mb-2 text-xs opacity-70">
                Links with activity
              </div>
              <div className="text-2xl font-semibold text-sky-400">
                {usageSummary.unique_links}
              </div>
            </div>
          </div>
        )}

        {/* Tables row: by test + by link */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* By test */}
          <div className="rounded-2xl border border-white/10 p-4 shadow-sm bg-slate-900/40">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-base font-medium text-sky-200">
                Submissions by test
              </h3>
              <button
                className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 transition hover:bg-sky-500 hover:text-white"
                disabled={!usageByTest.length}
                onClick={() =>
                  downloadCSV(
                    `usage_by_test_${csvSuffix}.csv`,
                    usageByTest.map((r) => ({
                      test_name: r.test_name,
                      test_slug: r.test_slug ?? "",
                      submissions: r.submissions,
                      first_submission: r.first_submission ?? "",
                      last_submission: r.last_submission ?? "",
                    }))
                  )
                }
              >
                Download CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-700 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-1 pr-3">Test</th>
                    <th className="py-1 px-3 text-right">Submissions</th>
                    <th className="py-1 px-3">First</th>
                    <th className="py-1 px-3">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {usageByTest.map((t) => (
                    <tr
                      key={t.test_id}
                      className="border-b border-slate-800/60 last:border-b-0"
                    >
                      <td className="py-1 pr-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {t.test_name}
                          </span>
                          {t.test_slug && (
                            <span className="text-[11px] text-slate-400">
                              {t.test_slug}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-3 text-right font-semibold">
                        {t.submissions}
                      </td>
                      <td className="py-1 px-3 text-slate-300">
                        {t.first_submission
                          ? new Date(t.first_submission).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-1 px-3 text-slate-300">
                        {t.last_submission
                          ? new Date(t.last_submission).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {!usageByTest.length && (
                    <tr>
                      <td
                        className="py-2 text-xs text-slate-400"
                        colSpan={4}
                      >
                        No submissions in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* By link */}
          <div className="rounded-2xl border border-white/10 p-4 shadow-sm bg-slate-900/40">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-base font-medium text-sky-200">
                Submissions by link
              </h3>
              <button
                className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 transition hover:bg-sky-500 hover:text-white"
                disabled={!usageByLink.length}
                onClick={() =>
                  downloadCSV(
                    `usage_by_link_${csvSuffix}.csv`,
                    usageByLink.map((r) => ({
                      link_name: r.link_name ?? "",
                      link_token: r.link_token ?? "",
                      test_name: r.test_name ?? "",
                      submissions: r.submissions,
                      first_submission: r.first_submission ?? "",
                      last_submission: r.last_submission ?? "",
                    }))
                  )
                }
              >
                Download CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-700 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-1 pr-3">Link</th>
                    <th className="py-1 px-3 text-right">Submissions</th>
                    <th className="py-1 px-3">First</th>
                    <th className="py-1 px-3">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {usageByLink.map((l, idx) => (
                    <tr
                      key={l.link_id ?? `nolink-${idx}`}
                      className="border-b border-slate-800/60 last:border-b-0"
                    >
                      <td className="py-1 pr-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {l.link_name || "Unnamed link"}
                          </span>
                          {l.test_name && (
                            <span className="text-[11px] text-slate-400">
                              {l.test_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-3 text-right font-semibold">
                        {l.submissions}
                      </td>
                      <td className="py-1 px-3 text-slate-300">
                        {l.first_submission
                          ? new Date(l.first_submission).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-1 px-3 text-slate-300">
                        {l.last_submission
                          ? new Date(l.last_submission).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {!usageByLink.length && (
                    <tr>
                      <td
                        className="py-2 text-xs text-slate-400"
                        colSpan={4}
                      >
                        No link activity in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity by day */}
        <div className="rounded-2xl border border-white/10 p-4 shadow-sm bg-slate-900/40">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-sky-200">
              Activity by day
            </h3>
            <button
              className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 transition hover:bg-sky-500 hover:text-white"
              disabled={!usageActivity.length}
              onClick={() =>
                downloadCSV(
                  `usage_activity_${csvSuffix}.csv`,
                  usageActivity.map((r) => ({
                    date: r.date,
                    submissions: r.submissions,
                  }))
                )
              }
            >
              Download CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead className="border-b border-slate-700 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-1 pr-3">Date</th>
                  <th className="py-1 px-3 text-right">Submissions</th>
                </tr>
              </thead>
              <tbody>
                {usageActivity.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-slate-800/60 last:border-b-0"
                  >
                    <td className="py-1 pr-3">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="py-1 px-3 text-right font-semibold">
                      {row.submissions}
                    </td>
                  </tr>
                ))}
                {!usageActivity.length && (
                  <tr>
                    <td
                      className="py-2 text-xs text-slate-400"
                      colSpan={2}
                    >
                      No activity in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
