// app/report/[id]/ReportViz.tsx
"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type NumRec = Record<string, number> | null | undefined;

type Props = {
  profiles: NumRec;
  flows: NumRec; // may be {} – we’ll derive from profiles if empty
};

// Map profile codes -> primary flow (adjust/extend as you add profiles)
const PROFILE_TO_FLOW: Record<string, "Catalyst" | "Communicator" | "Rhythmic" | "Observer"> = {
  // CC DNA (examples based on your naming)
  INN: "Catalyst",        // Innovator
  CA:  "Observer",        // Change Agent (Obs–Cat; we use Observer as primary)
  ST:  "Catalyst",        // Storyteller (if present)
  HC:  "Communicator",    // Heart-Centred
  NG:  "Communicator",    // Negotiator
  GG:  "Rhythmic",        // Grounded Guide
  TH:  "Observer",        // Thinker (Rhythmic–Observer; choose Observer)
  MM:  "Observer",        // Mastermind
  INV: "Catalyst",        // If you keep “Inventor/Investor” code
};

function normalize(rec: Record<string, number>): Array<{ name: string; value: number; pct: number }> {
  const entries = Object.entries(rec).filter(([, v]) => Number.isFinite(v) && v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 0;
  return entries
    .map(([k, v]) => ({
      name: k,
      value: v,
      pct: total ? Math.round((v / total) * 1000) / 10 : 0, // 1 decimal
    }))
    .sort((a, b) => b.value - a.value);
}

export default function ReportViz({ profiles, flows }: Props) {
  const profRec = useMemo(() => Object.fromEntries(
    Object.entries(profiles ?? {}).map(([k, v]) => [k, Number(v) || 0])
  ), [profiles]);

  // If flow scores are empty, derive from profiles via PROFILE_TO_FLOW
  const flowRec = useMemo(() => {
    const f = Object.fromEntries(
      Object.entries(flows ?? {}).map(([k, v]) => [k, Number(v) || 0])
    );

    const hasFlowScores = Object.values(f).some(v => v > 0);
    if (hasFlowScores) return f;

    // derive
    const derived: Record<string, number> = { Catalyst: 0, Communicator: 0, Rhythmic: 0, Observer: 0 };
    for (const [code, score] of Object.entries(profRec)) {
      const flow = PROFILE_TO_FLOW[code];
      if (flow) derived[flow] = (derived[flow] ?? 0) + (Number(score) || 0);
    }
    return derived;
  }, [flows, profRec]);

  const profData = useMemo(() => normalize(profRec), [profRec]);
  const flowData = useMemo(() => normalize(flowRec), [flowRec]);

  const main = profData[0];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Flow pie */}
      <div className="border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Coaching Flow (frequency)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={flowData} dataKey="value" nameKey="name" outerRadius={100} label>
                {flowData.map((_, i) => <Cell key={i} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profile breakdown */}
      <div className="border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Profiles</h3>

        {main ? (
          <div className="mb-3">
            <div className="text-2xl font-semibold">
              {main.name} <span className="text-gray-600 text-base font-normal">· {main.pct}%</span>
            </div>
            <p className="text-sm text-gray-600">Primary profile</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No profile scores available.</p>
        )}

        {profData.length > 1 && (
          <ul className="grid grid-cols-2 gap-2">
            {profData.slice(1, 5).map((p) => (
              <li key={p.name} className="border rounded px-3 py-2 flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-gray-700">{p.pct}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
