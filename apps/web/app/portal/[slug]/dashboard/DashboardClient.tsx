// apps/web/app/portal/[slug]/dashboard/DashboardClient.tsx
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

type TestMeta = {
  id: string;
  name: string;
  slug: string;
  is_default_dashboard?: boolean | null;
};

type TestsResponse =
  | { ok: true; tests: TestMeta[] }
  | { ok: false; error: string };

type TimeRangeValue =
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "all_time";

const TIME_RANGE_OPTIONS: { value: TimeRangeValue; label: string }[] = [
  { value: "this_week", label: "This week (default)" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "all_time", label: "All time" },
];

const COLORS = {
  tileBg: "rgba(45,143,196,0.05)",
  primary: "#2d8fc4",
  accent: "#64bae2",
};

const FREQ_SEGMENT_COLORS = [
  "#64bae2", // light blue
  "#2d8fc4", // mid blue
  "#0ea5e9", // cyan-ish
  "#0369a1", // deep blue
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

function downloadCSV(filename: string, rows: KV[]) {
  if (!rows.length) return;
  const csv = toCSV(
    rows.map((r) => ({
      name: r.key,
      value: r.value,
      percent: r.percent ?? "",
    }))
  );
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

  const [tests, setTests] = useState<TestMeta[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("this_week");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);

  // ---- Load tests for this org ----
  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;
      try {
        const res = await fetch(
          `/api/portal-tests?org=${encodeURIComponent(slug)}`,
          { cache: "no-store" }
        );
        const json: TestsResponse = await res.json();
        if (!active) return;
        if (json.ok) {
          setTests(json.tests);
          // pick default test if none selected
          if (!selectedTestId && json.tests.length) {
            const preferred =
              json.tests.find((t) => t.is_default_dashboard) ||
              json.tests[0];
            setSelectedTestId(preferred.id);
          }
        } else {
          console.error("Failed to load tests:", json.error);
        }
      } catch (e) {
        console.error("Failed to load tests", e);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ---- Load dashboard data for org + test + time range ----
  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("org", slug);
        if (selectedTestId) params.set("testId", selectedTestId);
        if (timeRange) params.set("range", timeRange);

        const res = await fetch(`/api/portal-dashboard?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!active) return;
        if (!json?.ok) {
          setError(json?.error || "Unknown error");
          setData(null);
        } else {
          setData(json.data as Payload);
        }
      } catch (e: any) {
        if (active) {
          setError(e?.message ?? "Network error");
          setData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, selectedTestId, timeRange]);

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

  const activeTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) || null,
    [tests, selectedTestId]
  );

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Test</span>
            <select
              className="min-w-[260px] rounded-md border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-50"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
            >
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.slug}
                  {t.is_default_dashboard ? " (default)" : ""}
                </option>
              ))}
              {!tests.length && <option>No tests available</option>}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">
              Time range
            </span>
            <select
              className="min-w-[180px] rounded-md border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-50"
              value={timeRange}
              onChange={(e) =>
                setTimeRange(e.target.value as TimeRangeValue)
              }
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="self-start rounded-xl border border-sky-500/70 bg-sky-600/80 px-4 py-2 text-sm font-medium text-white shadow-sm opacity-60"
          disabled
        >
          Manage Test (coming soon)
        </button>
      </div>

      {/* Description row */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-300">
          Overview of frequency mix, profile distribution, and usage for your
          organisation.
        </p>
      </div>

      {/* Metric tiles */}
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
            {slug}
            {activeTest ? ` – ${activeTest.name}` : ""}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm opacity-70">Loading data…</div>}
      {error && <div className="text-sm text-red-400">Error: {error}</div>}

      {/* Charts row */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Frequencies – donut */}
        <div className="rounded-2xl border border-white/10 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Frequencies (% of total)</h2>
            <button
              className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white transition"
              disabled={!slug || !freq.length}
              onClick={() =>
                downloadCSV(
                  `frequencies_${slug}_${timeRange}.csv`,
                  freq
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
                              idx % FREQ_SEGMENT_COLORS.length
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
            <h2 className="text-lg font-medium">Profiles (% of total)</h2>
            <button
              className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white transition"
              disabled={!slug || !prof.length}
              onClick={() =>
                downloadCSV(
                  `profiles_${slug}_${timeRange}.csv`,
                  prof
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
                margin={{ left: 80, right: 32, top: 12, bottom: 12 }}
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
    </div>
  );
}
