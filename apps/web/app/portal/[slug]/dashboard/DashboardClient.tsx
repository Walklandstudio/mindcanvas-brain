"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

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
const Tooltip = dynamic(
  async () => (await import("recharts")).Tooltip,
  { ssr: false }
);
const CartesianGrid = dynamic(
  async () => (await import("recharts")).CartesianGrid,
  { ssr: false }
);
const LabelList = dynamic(
  async () => (await import("recharts")).LabelList,
  { ssr: false }
);

const PieChart = dynamic(
  async () => (await import("recharts")).PieChart,
  { ssr: false }
);
const Pie = dynamic(async () => (await import("recharts")).Pie, {
  ssr: false,
});
const Cell = dynamic(async () => (await import("recharts")).Cell, {
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

const COLORS = {
  freq: "#2d8fc4",
  prof: "#64bae2",
  tileBg: "rgba(15,23,42,0.9)",
};

const PIE_COLORS = [
  "#64bae2",
  "#2d8fc4",
  "#0ea5e9",
  "#0369a1",
  "#38bdf8",
  "#22c1c3",
  "#818cf8",
  "#4f46e5",
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
  const csv = toCSV(
    rows.map((r) => ({ name: r.key, value: r.value, percent: r.percent ?? "" }))
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/portal-dashboard?org=${encodeURIComponent(slug)}`,
          { cache: "no-store" }
        );
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
  }, [slug]);

  const freq = data?.frequencies ?? [];
  const prof = data?.profiles ?? [];
  const top3 = data?.top3 ?? [];
  const bottom3 = data?.bottom3 ?? [];
  const overall = data?.overall;

  const freqChartData = useMemo(
    () =>
      freq.map((f) => {
        const raw = f.percent || "0%";
        const num = Number(raw.replace("%", ""));
        return { name: f.key, percentNum: num, percent: raw };
      }),
    [freq]
  );

  const profChartData = useMemo(
    () =>
      prof.map((p) => {
        const raw = p.percent || "0%";
        const num = Number(raw.replace("%", ""));
        return { name: p.key, percentNum: num, percent: raw };
      }),
    [prof]
  );

  const basePath = slug ? `/portal/${slug}` : "";

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER – remove big second “Dashboard” heading, just show scope */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-300">
            {slug ? `Scope: ${slug}` : "Signature Profile Test dashboard"}
          </p>
        </div>
        <Link
          href={basePath ? `${basePath}/tests` : "#"}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-[#64bae2] to-[#2d8fc4] px-4 py-2 text-sm font-medium text-white shadow hover:brightness-110 transition disabled:opacity-40"
        >
          Manage Test
        </Link>
      </header>

      {/* KPI TILES */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
          <div className="text-xs text-slate-300">Overall Average</div>
          <div className="mt-1 text-2xl font-semibold text-[#64bae2]">
            {overall?.average ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
          <div className="text-xs text-slate-300">Total Responses</div>
          <div className="mt-1 text-2xl font-semibold text-[#64bae2]">
            {overall?.count ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
          <div className="text-xs text-slate-300">Scope</div>
          <div className="mt-1 text-2xl font-semibold text-[#64bae2]">
            {slug || "—"}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-300">Loading data…</div>}
      {error && <div className="text-sm text-red-400">Error: {error}</div>}

      {/* PIE for FREQUENCIES, BAR for PROFILES */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        {/* Frequencies pie chart */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">
              Frequencies (% of total)
            </h2>
            <button
              className="rounded-lg border border-[#2d8fc4] px-3 py-1 text-xs font-medium text-[#2d8fc4] hover:bg-[#2d8fc4] hover:text-white transition disabled:opacity-40"
              disabled={!slug || !freq.length}
              onClick={() => downloadCSV(`frequencies_${slug}.csv`, freq)}
            >
              Download CSV
            </button>
          </div>
          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-52 w-full md:w-1/2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={freqChartData}
                    dataKey="percentNum"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    innerRadius="45%"
                    paddingAngle={2}
                  >
                    {freqChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, _name: any, props: any) => [
                      `${v}%`,
                      props?.payload?.name || "Frequency",
                    ]}
                    contentStyle={{
                      backgroundColor: "#020617",
                      borderColor: "rgba(148,163,184,0.45)",
                      borderRadius: 8,
                      color: "#e5e7eb",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Frequencies legend */}
            <ul className="flex-1 space-y-1 text-xs">
              {freqChartData.map((f, index) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-slate-200">{f.name}</span>
                  </span>
                  <span className="font-semibold text-slate-50">
                    {f.percent ?? `${f.percentNum}%`}
                  </span>
                </li>
              ))}
              {!freqChartData.length && (
                <li className="text-slate-400">No frequency data yet.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Profiles bar chart */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">
              Profiles (% of total)
            </h2>
            <button
              className="rounded-lg border border-[#2d8fc4] px-3 py-1 text-xs font-medium text-[#2d8fc4] hover:bg-[#2d8fc4] hover:text-white transition disabled:opacity-40"
              disabled={!slug || !prof.length}
              onClick={() => downloadCSV(`profiles_${slug}.csv`, prof)}
            >
              Download CSV
            </button>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart
                data={profChartData}
                layout="vertical"
                margin={{ left: 160, right: 24, top: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.35)"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{
                    fill: "rgba(226,232,240,0.9)",
                    fontSize: 11,
                  }}
                  axisLine={{ stroke: "rgba(148,163,184,0.35)" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{
                    fill: "rgba(148,163,184,0.9)",
                    fontSize: 11,
                  }}
                  axisLine={{ stroke: "rgba(148,163,184,0.35)" }}
                />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, "Share"]}
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "rgba(148,163,184,0.45)",
                    borderRadius: 8,
                    color: "#e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="percentNum"
                  fill={COLORS.prof}
                  radius={[6, 6, 6, 6]}
                >
                  <LabelList
                    dataKey="percentNum"
                    position="right"
                    formatter={(v: any) => `${v}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* TOP / BOTTOM PROFILES */}
      {(top3.length || bottom3.length) && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            className="rounded-2xl border border-white/10 p-4 shadow-lg"
            style={{ backgroundColor: COLORS.tileBg }}
          >
            <h3 className="mb-2 text-sm font-semibold text-white">
              Top 3 Profiles
            </h3>
            <ul className="space-y-1 text-sm">
              {top3.map((t) => (
                <li
                  key={t.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-slate-200">{t.key}</span>
                  <span className="font-semibold text-slate-50">
                    {t.percent ?? `${t.value}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-2xl border border-white/10 p-4 shadow-lg"
            style={{ backgroundColor: COLORS.tileBg }}
          >
            <h3 className="mb-2 text-sm font-semibold text-white">
              Bottom 3 Profiles
            </h3>
            <ul className="space-y-1 text-sm">
              {bottom3.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-slate-200">{b.key}</span>
                  <span className="font-semibold text-slate-50">
                    {b.percent ?? `${b.value}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
