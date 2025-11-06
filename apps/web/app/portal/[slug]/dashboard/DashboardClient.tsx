"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

// Recharts (lazy, client-only)
const ResponsiveContainer = dynamic(
  async () => (await import("recharts")).ResponsiveContainer,
  { ssr: false }
);
const BarChart = dynamic(async () => (await import("recharts")).BarChart, { ssr: false });
const Bar = dynamic(async () => (await import("recharts")).Bar, { ssr: false });
const XAxis = dynamic(async () => (await import("recharts")).XAxis, { ssr: false });
const YAxis = dynamic(async () => (await import("recharts")).YAxis, { ssr: false });
const Tooltip = dynamic(async () => (await import("recharts")).Tooltip, { ssr: false });
const CartesianGrid = dynamic(async () => (await import("recharts")).CartesianGrid, { ssr: false });
const LabelList = dynamic(async () => (await import("recharts")).LabelList, { ssr: false });
const Cell = dynamic(async () => (await import("recharts")).Cell, { ssr: false });

type KV = { key: string; value: number; percent?: string };
type Payload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

type ApiResponse = {
  ok: boolean;
  org: string;
  testId: string | null;
  data: Payload;
  error?: string;
};

// CSV helpers
function toCSV(rows: Record<string, any>[]) {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join(
    "\n"
  );
}
function downloadCSV(filename: string, rows: KV[]) {
  const csv = toCSV(rows.map((r) => ({ name: r.key, value: r.value, percent: r.percent ?? "" })));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Primary colours: Blue, Red, Yellow, Green
const frequencyColors = ["#1E90FF", "#FF4136", "#FFDC00", "#2ECC40"];
// Profiles palette (8 distinct)
const profilePalette = [
  "#1E90FF",
  "#FF4136",
  "#FFDC00",
  "#2ECC40",
  "#B10DC9",
  "#0074D9",
  "#FF851B",
  "#3D9970",
];

export default function DashboardClient() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const search = useSearchParams();
  const testId = search.get("testId")?.trim() || ""; // optional

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
        const qs = new URLSearchParams({ org: slug, ...(testId ? { testId } : {}) });
        const res = await fetch(`/api/portal-dashboard?${qs.toString()}`, { cache: "no-store" });
        const json: ApiResponse = await res.json();
        if (!active) return;
        if (!json.ok) setError(json.error || "Unknown error");
        else setData(json.data);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Network error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, testId]);

  const freq = data?.frequencies ?? [];
  const prof = data?.profiles ?? [];
  const top3 = data?.top3 ?? [];
  const bottom3 = data?.bottom3 ?? [];
  const overall = data?.overall;

  // Normalize into chart-ready rows with numeric pct for bars
  const freqRows = useMemo(() => {
    return freq.map((f) => ({
      ...f,
      pct: parseFloat((f.percent || "0").replace("%", "")) || 0,
    }));
  }, [freq]);

  const profRows = useMemo(() => {
    return prof.map((p) => ({
      ...p,
      pct: parseFloat((p.percent || "0").replace("%", "")) || 0,
    }));
  }, [prof]);

  // Sort for readability (descending)
  const freqSorted = useMemo(() => [...freqRows].sort((a, b) => b.pct - a.pct), [freqRows]);
  const profSorted = useMemo(() => [...profRows].sort((a, b) => b.pct - a.pct), [profRows]);

  // Tooltip renderer that shows both % and value
  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    return (
      <div className="rounded-md border bg-white p-2 text-xs shadow">
        <div className="font-medium">{label}</div>
        {p?.percent ? <div>Share: {p.percent}</div> : null}
        <div>Value: {p?.value ?? "—"}</div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {!slug && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          This page expects a slug in the path like <code>/portal/team-puzzle/dashboard</code>.
        </div>
      )}

      {loading && <div className="text-sm opacity-70">Loading data…</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {/* KPI tiles */}
      {overall && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-60">Overall Average</div>
            <div className="text-2xl font-semibold">
              {overall.average != null ? overall.average : "—"}
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-60">Total Responses</div>
            <div className="text-2xl font-semibold">{overall.count ?? "—"}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-60">Scope</div>
            <div className="text-2xl font-semibold">{slug}</div>
          </div>
        </div>
      )}

      {/* Frequencies */}
      <section className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Frequencies (% of total)</h2>
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            disabled={!slug || !freq.length}
            onClick={() =>
              downloadCSV(`frequencies_${slug}${testId ? `_${testId}` : ""}.csv`, freq)
            }
          >
            Download CSV
          </button>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={freqSorted}
              layout="vertical"
              margin={{ left: 120, right: 24, top: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="key" width={160} />
              <Tooltip content={renderTooltip} />
              <Bar dataKey="pct" radius={[4, 4, 4, 4]}>
                <LabelList dataKey="percent" position="right" className="text-xs" />
                {freqSorted.map((_, i) => (
                  <Cell key={`cell-f-${i}`} fill={frequencyColors[i % frequencyColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Profiles */}
      <section className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Profiles (% of total)</h2>
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            disabled={!slug || !prof.length}
            onClick={() => downloadCSV(`profiles_${slug}${testId ? `_${testId}` : ""}.csv`, prof)}
          >
            Download CSV
          </button>
        </div>

        <div className="h-[520px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={profSorted}
              layout="vertical"
              margin={{ left: 220, right: 24, top: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="key" width={260} />
              <Tooltip content={renderTooltip} />
              <Bar dataKey="pct" radius={[4, 4, 4, 4]}>
                <LabelList dataKey="percent" position="right" className="text-xs" />
                {profSorted.map((_, i) => (
                  <Cell key={`cell-p-${i}`} fill={profilePalette[i % profilePalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {(top3.length > 0 || bottom3.length > 0) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <h3 className="mb-2 text-base font-medium">Top 3 Profiles</h3>
            <ul className="space-y-1 text-sm">
              {top3.map((t) => (
                <li key={t.key} className="flex items-center justify-between">
                  <span>{t.key}</span>
                  <span className="font-semibold">{t.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-4">
            <h3 className="mb-2 text-base font-medium">Bottom 3 Profiles</h3>
            <ul className="space-y-1 text-sm">
              {bottom3.map((b) => (
                <li key={b.key} className="flex items-center justify-between">
                  <span>{b.key}</span>
                  <span className="font-semibold">{b.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
