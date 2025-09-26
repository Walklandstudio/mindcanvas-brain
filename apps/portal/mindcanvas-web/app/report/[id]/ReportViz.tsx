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

// YOUR brand colors for the pie
const FLOW_COLORS: Record<FlowLabel, string> = {
  "Catalyst Coaching Flow": "#2ecc2f",
  "Communications Coaching Flow": "#ea430e",
  "Rhythmic Coaching Flow": "#f3c90d",
  "Observer Coaching Flow": "#f3c90d",
};

export default function ReportViz({ profiles = {}, flows = {} }: Props) {
  // ----- Derive Flow totals -----
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

  // ----- Profiles (main + auxiliaries as % ) -----
  const scalars = Object.entries(profiles)
    .map(([code, v]) => [toProfileKey(code), Number(v) || 0] as [ProfileKey | undefined, number])
    .filter(([k]) => !!k) as [ProfileKey, number][];

  const total = scalars.reduce((s, [, v]) => s + v, 0) || 1;

  const profileRows = scalars
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => ({
      code: k,
      name: PROFILE_NAMES[k],
      raw: v,
      pct: Math.round((v / total) * 100),
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
                {flowData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={FLOW_COLORS[d.name as FlowLabel] ?? "#9CA3AF"}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profiles: main + auxiliaries as percentages */}
      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Profiles</h3>

        {profileRows.length === 0 ? (
          <p className="text-sm text-gray-500">No profile scores available.</p>
        ) : (
          <ul className="space-y-2">
            {profileRows.map((r, i) => (
              <li key={r.code} className="text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && (
                      <span className="inline-flex items-center rounded-full bg-gray-900 text-white text-[10px] px-2 py-0.5">
                        Main
                      </span>
                    )}
                    <span className={i === 0 ? "font-semibold" : ""}>{r.name}</span>
                  </div>
                  <span className="tabular-nums">{r.pct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded">
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${r.pct}%`,
                      backgroundColor: i === 0 ? "#111827" : "#9CA3AF",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
