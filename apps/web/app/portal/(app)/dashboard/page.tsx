"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/@/components/ui/Card";

import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell
} from "recharts";

type FreqRow = { frequency_code: "A"|"B"|"C"|"D"; frequency_name: string; avg_points: number|string };
type ProfRow = { profile_code: string; profile_name: string; avg_points: number|string };
type OverallRow = { overall_avg: number|string };

type DashData = {
  frequencies: FreqRow[];
  profiles: ProfRow[];
  top3: ProfRow[];
  low3: ProfRow[];
  overall: OverallRow;
};

const FREQ_ORDER: Array<"A"|"B"|"C"|"D"> = ["A", "B", "C", "D"];
const FREQ_COLORS: Record<string,string> = {
  A: "#7C3AED", // Innovation
  B: "#F59E0B", // Influence
  C: "#10B981", // Implementation
  D: "#3B82F6", // Insight
};

const PROFILE_COLORS: Record<string,string> = {
  PROFILE_1: "#7C3AED", PROFILE_2: "#8B5CF6",
  PROFILE_3: "#F59E0B", PROFILE_4: "#FBBF24",
  PROFILE_5: "#10B981", PROFILE_6: "#34D399",
  PROFILE_7: "#3B82F6", PROFILE_8: "#60A5FA",
  default: "#9CA3AF",
};

async function fetchDashboard(orgSlug: string, testId: string): Promise<DashData> {
  const res = await fetch(`/api/portal-dashboard?orgSlug=${orgSlug}&testId=${testId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export default function DashboardPage() {
  const params = useSearchParams();
  // Defaults for quick dev; override via ?orgSlug=team-puzzle&testId=...
  const orgSlug = params.get("orgSlug") ?? "team-puzzle";
  const testId = params.get("testId") ?? "2d16a987-17a3-46b4-9fa7-c6a1c1458797";

  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetchDashboard(orgSlug, testId)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [orgSlug, testId]);

  const radarData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    data.frequencies.forEach((r) => map.set(r.frequency_code, Number(r.avg_points)));
    return FREQ_ORDER.map((code) => ({
      code,
      name: data.frequencies.find((f) => f.frequency_code === code)?.frequency_name ?? code,
      value: map.get(code) ?? 0,
    }));
  }, [data]);

  const profileBars = useMemo(() => {
    if (!data) return [];
    return [...data.profiles]
      .map((p) => ({ code: p.profile_code, name: p.profile_name, value: Number(p.avg_points) }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const overallPct = useMemo(() => {
    if (!data) return 0;
    const v = Number(data.overall?.overall_avg ?? 0);
    // If you want a capped 0–100 gauge, scale here. For now just clamp.
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    return clamped;
  }, [data]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>;
  if (err) return <div className="p-6 text-sm text-red-600">Error: {err}</div>;
  if (!data) return null;

  return (
    <div className="p-6 grid grid-cols-12 gap-6">
      {/* Header / Context */}
      <Card className="col-span-12">
        <CardHeader>
          <CardTitle>MindCanvas Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          org: <b>{orgSlug}</b> &nbsp;•&nbsp; testId: <b>{testId}</b>
        </CardContent>
      </Card>

      {/* Gauge */}
      <Card className="col-span-4">
        <CardHeader><CardTitle>Average Rating</CardTitle></CardHeader>
        <CardContent>
          <div className="relative mx-auto h-40 w-40">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200" />
            <div
              className="absolute inset-0 rounded-full border-8"
              style={{
                borderColor: "#10B981",
                clipPath: "polygon(50% 50%, 0% 50%, 0% 0%, 100% 0%, 100% 50%)",
                transform: `rotate(${(overallPct/100)*180 - 90}deg)`,
                transformOrigin: "50% 50%",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xl font-semibold">{overallPct}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar (Style Circle) */}
      <Card className="col-span-8">
        <CardHeader><CardTitle>Style Circle</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <Radar dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Domain Breakdown (profiles) */}
      <Card className="col-span-12">
        <CardHeader><CardTitle>Domain Breakdown (Profiles)</CardTitle></CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer>
            <BarChart data={profileBars} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={200} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Avg points">
                {profileBars.map((row, idx) => (
                  <Cell key={idx} fill={PROFILE_COLORS[row.code] ?? PROFILE_COLORS.default} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Highlights / Lowlights */}
      <Card className="col-span-6">
        <CardHeader><CardTitle>Highlights (Top 3)</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.top3.map((t, i) => (
              <li key={`${t.profile_code}-${i}`} className="flex items-center justify-between">
                <span className="font-medium">{t.profile_name}</span>
                <span className="text-emerald-600">{Number(t.avg_points)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="col-span-6">
        <CardHeader><CardTitle>Lowlights (Bottom 3)</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.low3.map((t, i) => (
              <li key={`${t.profile_code}-${i}`} className="flex items-center justify-between">
                <span className="font-medium">{t.profile_name}</span>
                <span className="text-rose-600">{Number(t.avg_points)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
