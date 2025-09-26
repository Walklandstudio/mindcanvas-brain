// app/report/[id]/ReportViz.tsx
"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  PROFILE_TO_FLOW,
  PROFILE_NAMES,
  FLOW_LONG,
  type FlowLabel,
  type ProfileKey,
  toProfileKey,
} from "@/lib/profileMeta";

type Props = {
  profiles?: Record<string, number>;
  flows?: Record<string, number>;
};

type FlowKey = "A" | "B" | "R" | "O";
function isFlowKey(s: string): s is FlowKey {
  return s === "A" || s === "B" || s === "R" || s === "O";
}
const FLOW_ORDER: FlowLabel[] = [
  "Catalyst Coaching Flow",
  "Communications Coaching Flow",
  "Rhythmic Coaching Flow",
  "Observer Coaching Flow",
];

// Neutral greys for charts
const CHART_COLORS = ["#6B7280", "#9CA3AF", "#D1D5DB", "#111827"];

export default function ReportViz({ profiles = {}, flows = {} }: Props) {
  // 1) Build flow totals
  const totals = FLOW_ORDER.reduce(
    (acc, label) => ((acc[label] = 0), acc),
    {} as Record<FlowLabel, number>
  );

  if (Object.keys(flows).length > 0) {
    for (const [k, raw] of Object.entries(flows)) {
      const val = Number(raw) || 0;
      if (isFlowKey(k)) {
        const label = FLOW_LONG[k];
        totals[label] += val;
      } else if ((FLOW_ORDER as readonly string[]).includes(k)) {
        totals[k as FlowLabel] += val;
      }
    }
  } else if (Object.keys(profiles).length > 0) {
    for (const [code, raw] of Object.entries(profiles)) {
      const key: ProfileKey | undefined = toProfileKey(code);
      if (!key) continue;
      const label = PROFILE_TO_FLOW[key];
      totals[label] = (totals[label] ?? 0) + (Number(raw) || 0);
    }
  }

  const flowData = FLOW_ORDER.map((label) => ({
    name: label,
    value: totals[label] || 0,
  }));

  // 2) Profiles list (sorted)
  const profileRows = Object.entries(profiles)
    .map(([code, v]) => [toProfileKey(code), Number(v) || 0] as [ProfileKey | undefined, number])
    .filter(([k]) => !!k)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, value]) => ({
      code: k as ProfileKey,
      name: PROFILE_NAMES[k as ProfileKey],
      value,
    }));

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Coaching Flow Pie */}
      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Coaching Flow</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={flowData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
              >
                {flowData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profiles list */}
      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Profiles</h3>
        <ul className="space-y-1 text-sm">
          {profileRows.length === 0 ? (
            <li className="text-gray-500">No profile scores available.</li>
          ) : (
            profileRows.map((r) => (
              <li key={r.code} className="flex items-center justify-between">
                <span>{r.name}</span>
                <span className="tabular-nums">{r.value}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
