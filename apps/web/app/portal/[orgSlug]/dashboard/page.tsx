"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

/** Canonical shared types — export so the server page can import them */
export type FreqRow = {
  frequency_code: string; // relaxed to string to allow DB values A/B/C/D (or future)
  frequency_name: string;
  avg_points: number | string;
};

export type ProfRow = {
  profile_code: string;
  profile_name: string;
  avg_points: number | string;
};

export default function DashboardClient(props: {
  orgSlug: string;
  testId: string;
  frequencies: FreqRow[];
  profiles: ProfRow[];
  top3: ProfRow[];
  low3: ProfRow[];
  overall: number | string;
}) {
  const freqData = (props.frequencies ?? []).map((r) => ({
    name: r.frequency_name,
    points: Number(r.avg_points),
    code: r.frequency_code,
  }));

  const profData = (props.profiles ?? [])
    .map((r) => ({
      name: r.profile_name,
      points: Number(r.avg_points),
      code: r.profile_code,
    }))
    .sort((a, b) => b.points - a.points);

  const overallPct = Math.max(0, Math.min(100, Math.round(Number(props.overall) || 0)));

  return (
    <div className="p-6 grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardHeader>
          <CardTitle>MindCanvas Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          org: <b>{props.orgSlug}</b> • test: <b>{props.testId}</b>
        </CardContent>
      </Card>

      {/* Gauge (simple) */}
      <Card className="col-span-12 lg:col-span-4">
        <CardHeader>
          <CardTitle>Average Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mx-auto h-40 w-40">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200" />
            <div
              className="absolute inset-0 rounded-full border-8"
              style={{
                borderColor: "#10B981",
                clipPath: "polygon(50% 50%, 0% 50%, 0% 0%, 100% 0%, 100% 50%)",
                transform: `rotate(${(overallPct / 100) * 180 - 90}deg)`,
                transformOrigin: "50% 50%",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xl font-semibold">{overallPct}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequencies */}
      <Card className="col-span-12 lg:col-span-8">
        <CardHeader>
          <CardTitle>Frequency Mix</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <BarChart data={freqData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="points" name="Avg points" radius={[6, 6, 0, 0]}>
                {freqData.map((row, i) => (
                  <Cell key={i} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profiles */}
      <Card className="col-span-12">
        <CardHeader>
          <CardTitle>Profile Mix</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer>
            <BarChart data={profData} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={200} />
              <Tooltip />
              <Bar dataKey="points" name="Avg points" radius={[6, 6, 0, 0]}>
                {profData.map((row, i) => (
                  <Cell key={i} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Highlights / Lowlights */}
      <Card className="col-span-12 lg:col-span-6">
        <CardHeader>
          <CardTitle>Highlights (Top 3)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(props.top3 ?? []).map((t, i) => (
              <li key={`${t.profile_code}-${i}`} className="flex items-center justify-between">
                <span className="font-medium">{t.profile_name}</span>
                <span className="text-emerald-600">{Number(t.avg_points)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6">
        <CardHeader>
          <CardTitle>Lowlights (Bottom 3)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(props.low3 ?? []).map((t, i) => (
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
