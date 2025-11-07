"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load Recharts on client
const ResponsiveContainer = dynamic(async () => (await import("recharts")).ResponsiveContainer, { ssr: false });
const BarChart           = dynamic(async () => (await import("recharts")).BarChart, { ssr: false });
const Bar                = dynamic(async () => (await import("recharts")).Bar, { ssr: false });
const XAxis              = dynamic(async () => (await import("recharts")).XAxis, { ssr: false });
const YAxis              = dynamic(async () => (await import("recharts")).YAxis, { ssr: false });
const Tooltip            = dynamic(async () => (await import("recharts")).Tooltip, { ssr: false });
const CartesianGrid      = dynamic(async () => (await import("recharts")).CartesianGrid, { ssr: false });
const LabelList          = dynamic(async () => (await import("recharts")).LabelList, { ssr: false });

type KV = { key: string; value: number; percent?: string };
type Payload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

const COLORS = {
  freq: ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"], // blue, green, amber, red
  prof: ["#0ea5e9"], // single color (keeps layout clean)
};

function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
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

export default function DashboardClient() {
  const pathname = usePathname();
  // Path is /portal/[slug]/dashboard → take segment after /portal
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
        const res = await fetch(`/api/portal-dashboard?org=${encodeURIComponent(slug)}`, { cache: "no-store" });
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
    return () => { active = false; };
  }, [slug]);

  const freq = data?.frequencies ?? [];
  const prof = data?.profiles ?? [];
  const top3 = data?.top3 ?? [];
  const bottom3 = data?.bottom3 ?? [];
  const overall = data?.overall;

  // chart data: left axis = labels, bar = percentage (as number)
  const freqChartData = useMemo(
    () => freq.map((f) => ({ name: f.key, percentNum: Number((f.percent || "0%").replace("%", "")) })),
    [freq]
  );
  const profChartData = useMemo(
    () => prof.map((p) => ({ name: p.key, percentNum: Number((p.percent || "0%").replace("%", "")) })),
    [prof]
  );

  return (
    <div className="space-y-8">
      {/* Header tiles */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-4">
          <div className="text-xs opacity-60">Overall Average</div>
          <div className="text-2xl font-semibold">{overall?.average ?? "—"}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs opacity-60">Total Responses</div>
          <div className="text-2xl font-semibold">{overall?.count ?? "—"}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs opacity-60">Scope</div>
          <div className="text-2xl font-semibold">{slug || "—"}</div>
        </div>
      </div>

      {loading && <div className="text-sm opacity-70">Loading data…</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {/* Frequencies */}
      <section className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Frequencies (% of total)</h2>
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            disabled={!slug || !freq.length}
            onClick={() => downloadCSV(`frequencies_${slug}.csv`, freq)}
          >
            Download CSV
          </button>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={freqChartData} layout="vertical" margin={{ left: 80, right: 24, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip formatter={(v: any) => [`${v}%`, "Share"]} />
              <Bar dataKey="percentNum" fill={COLORS.freq[0]}>
                <LabelList dataKey="percentNum" position="right" formatter={(v: any) => `${v}%`} />
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
            onClick={() => downloadCSV(`profiles_${slug}.csv`, prof)}
          >
            Download CSV
          </button>
        </div>
        <div className="h-[480px] w-full">
          <ResponsiveContainer>
            <BarChart data={profChartData} layout="vertical" margin={{ left: 180, right: 24, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={220} />
              <Tooltip formatter={(v: any) => [`${v}%`, "Share"]} />
              <Bar dataKey="percentNum" fill={COLORS.prof[0]}>
                <LabelList dataKey="percentNum" position="right" formatter={(v: any) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top/Bottom 3 */}
      {(top3.length || bottom3.length) ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <h3 className="mb-2 text-base font-medium">Top 3 Profiles</h3>
            <ul className="space-y-1 text-sm">
              {top3.map((t) => (
                <li key={t.key} className="flex items-center justify-between">
                  <span>{t.key}</span>
                  <span className="font-semibold">{t.percent ?? `${t.value}`}</span>
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
                  <span className="font-semibold">{b.percent ?? `${b.value}`}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
