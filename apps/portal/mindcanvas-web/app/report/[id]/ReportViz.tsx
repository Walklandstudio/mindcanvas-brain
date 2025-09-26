// app/report/[id]/ReportViz.tsx
"use client";

import {
  Pie,
  PieChart,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FLOW_COLORS,
  PROFILE_COLORS,
  PROFILE_PRIMARY_FLOW,
  PROFILE_HYBRID_WEIGHTS,
  PROFILE_TITLES,
  type FlowLabel,
  type ProfileKey,
} from "@/lib/profileImages";

type NumMap<T extends string> = Partial<Record<T, number>>;

export type VizProps = {
  profileScores: NumMap<ProfileKey>;
  flowScores?: NumMap<FlowLabel>;
  mainProfile?: ProfileKey;
};

function sum<T extends string>(m: NumMap<T>): number {
  return Object.values(m).reduce((a, b) => a + (b ?? 0), 0);
}

function deriveFlowsFromProfiles(profiles: NumMap<ProfileKey>): NumMap<FlowLabel> {
  const out: NumMap<FlowLabel> = {};
  const keys = Object.keys(PROFILE_TITLES) as ProfileKey[];

  for (const k of keys) {
    const score = profiles[k] ?? 0;
    if (!score) continue;

    const hybrid = PROFILE_HYBRID_WEIGHTS[k];
    if (hybrid) {
      out[hybrid.a] = (out[hybrid.a] ?? 0) + score * hybrid.wA;
      out[hybrid.b] = (out[hybrid.b] ?? 0) + score * hybrid.wB;
    } else {
      const f = PROFILE_PRIMARY_FLOW[k];
      out[f] = (out[f] ?? 0) + score;
    }
  }
  return out;
}

export default function ReportViz({ profileScores, flowScores, mainProfile }: VizProps) {
  const flows = flowScores ?? deriveFlowsFromProfiles(profileScores);

  // ----- Pie data (4 flows) -----
  const FLOW_ORDER: FlowLabel[] = [
    "Catalyst Coaching Flow",
    "Communications Coaching Flow",
    "Rhythmic Coaching Flow",
    "Observer Coaching Flow",
  ];
  const flowTotal = Math.max(1, sum(flows));
  const flowData = FLOW_ORDER.map((label) => ({
    name: label,
    value: Math.round(((flows[label] ?? 0) / flowTotal) * 100),
    color: FLOW_COLORS[label],
  }));

  // ----- Profile list with colours & %
  const PORDER = Object.keys(PROFILE_TITLES) as ProfileKey[];
  const profTotal = Math.max(1, sum(profileScores));
  const rows = PORDER
    .map((code) => ({
      code,
      name: PROFILE_TITLES[code],
      pct: Math.round(((profileScores[code] ?? 0) / profTotal) * 100),
    }))
    .filter((r) => r.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const main = (mainProfile && rows.find((r) => r.code === mainProfile)) ? mainProfile : rows[0]?.code;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Flow pie */}
      <div className="rounded-2xl border p-5">
        <h3 className="text-lg font-semibold mb-4">Coaching Flow</h3>
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={flowData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="55%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={1}
              >
                {flowData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profiles with coloured bars */}
      <div className="rounded-2xl border p-5">
        <h3 className="text-lg font-semibold mb-4">Profiles</h3>
        {rows.length === 0 ? (
          <p className="text-slate-500">No profile scores available.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.code}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={`font-medium ${r.code === main ? "text-slate-900" : "text-slate-600"}`}>
                    {PROFILE_TITLES[r.code]}
                  </span>
                  <span className={`tabular-nums ${r.code === main ? "font-semibold" : ""}`}>{r.pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded">
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${r.pct}%`,
                      backgroundColor: PROFILE_COLORS[r.code],
                      boxShadow: r.code === main ? "0 0 0 1px rgba(0,0,0,.15) inset" : undefined,
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
