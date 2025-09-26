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
} from "@/lib/profileMeta";

type Props = {
  profiles?: Record<string, number>;
  flows?: Record<string, number>;
};

// Helpers to narrow strings to our unions
function isProfileKey(s: string): s is ProfileKey {
  return (
    s === "P1" ||
    s === "P2" ||
    s === "P3" ||
    s === "P4" ||
    s === "P5" ||
    s === "P6" ||
    s === "P7" ||
    s === "P8"
  );
}
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

// Neutral greys (your branded colors come via Hero/FlowBlock)
const CHART_COLORS = ["#6B7280", "#9CA3AF", "#D1D5DB", "#111827"];

export default function ReportViz({ profiles = {}, flows = {} }: Props) {
  // 1) Derive flow totals either from flows input (A/B/R/O or labels) or from profile scores
  const flowTotals = FLOW_ORDER.reduce((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {} as Record<FlowLabel, number>);

  if (Object.keys(flows).length > 0) {
    for (const [k, vRaw] of Object.entries(flows)) {
      const v = Number(vRaw) || 0;
      if (isFlowKey(k)) {
        const label = FLOW_LONG[k];
        flowTotals[label] += v;
      } else if ((FLOW_ORDER as readonly string[]).includes(k)) {
        // flows object already used long labels
        flowTotals[k as FlowLabel] += v;
      }
    }
  } else if (Object.keys(profiles).length > 0) {
    // Derive from profile scores
    for (const [code, scoreRaw] of Object.entries(profiles)) {
      const score = Number(scoreRaw) || 0;
      const up = code.toUpperCase();
      if (isProfileKey(up)) {
        const label = PROFILE_TO_FLOW[up]; // FlowLabel
        flowTotals[label] = (flowTotals[label] ?? 0) + score;
      }
    }
  }

  const flowData = FLOW_ORDER.map((label) => ({
    name: label,
    value: flowTotals[label] || 0,
  }));

  // 2) Profiles list (sorted desc)
  const profileRows = Object.entries(profiles)
    .map(([code, v]) => [code.toUpperCase(), Number(v) || 0] as [string, number])
    .filter(([code]) => isProfileKey(code))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, value]) => ({
      code,
      name: PROFILE_NAMES[code as ProfileKey] ?? code,
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
