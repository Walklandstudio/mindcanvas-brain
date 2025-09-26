// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type WeeklyRow = { wk?: string; week?: string; tests?: number; total?: number };
type DistRow = { profile?: string; count?: number; tests?: number };

type WeeklyAPI = { rows?: WeeklyRow[] } | WeeklyRow[];
type DistAPI = { rows?: DistRow[] } | DistRow[];

export default function DashboardPage() {
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [dist, setDist] = useState<DistRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const wRes = await fetch("/api/dashboard/weekly", { cache: "no-store" });
        const wJson = (await wRes.json()) as WeeklyAPI;
        setWeekly(Array.isArray(wJson) ? wJson : wJson.rows ?? []);

        const dRes = await fetch("/api/dashboard/distribution", { cache: "no-store" });
        const dJson = (await dRes.json()) as DistAPI;
        setDist(Array.isArray(dJson) ? dJson : dJson.rows ?? []);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const weeklyData = useMemo(
    () =>
      weekly.map((r) => ({
        week: r.wk ?? r.week ?? "",
        tests: r.tests ?? r.total ?? 0,
      })),
    [weekly]
  );

  const distData = useMemo(
    () =>
      dist.map((r) => ({
        name: r.profile ?? "Unknown",
        value: r.count ?? r.tests ?? 0,
      })),
    [dist]
  );

  return (
    <main className="p-6 space-y-6 max-w-5xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-600">Aggregate activity across all submissions.</p>
      </header>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-2">Tests per week</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tests" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-2">Profile distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {distData.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="text-sm">
        <a className="underline" href="/tests">
          Tests
        </a>{" "}
        ·{" "}
        <a className="underline" href="/me">
          My Tests
        </a>
      </div>
    </main>
  );
}
