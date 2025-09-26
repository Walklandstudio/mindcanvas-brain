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
import { PROFILE_TO_FLOW, profileNameFromCode, FlowLabel } from "@/lib/profileMeta";

type NumRec = Record<string, number> | null | undefined;

type Props = {
  profiles: NumRec;
  flows: NumRec; // may be {}
};

function normalize(rec: Record<string, number>): Array<{ name: string; value: number; pct: number }> {
  const entries = Object.entries(rec).filter(([, v]) => Number.isFinite(v) && v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 0;
  return entries
    .map(([k, v]) => ({
      name: k,
      value: v,
      pct: total ? Math.round((v / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export default function ReportViz({ profiles, flows }: Props) {
  // Profiles: coerce to numbers and rename to full names
  const profNamed = useMemo(() => {
    const numeric = Object.fromEntries(
      Object.entries(profiles ?? {}).map(([k, v]) => [k, Number(v) || 0])
    );
    const named: Record<string, number> = {};
    for (const [code, score] of Object.entries(numeric)) {
      const name = profileNameFromCode(code);
      named[name] = (named[name] ?? 0) + score;
    }
    return named;
  }, [profiles]);

  // Flows: use provided scores; if empty, derive from profiles via mapping
  const flowRec = useMemo(() => {
    const f = Object.fromEntries(Object.entries(flows ?? {}).map(([k, v]) => [k, Number(v) || 0]));
    const hasAny = Object.values(f).some(v => v > 0);
    if (hasAny) return f;

    // derive from original profile codes (before renaming)
    const original = Object.fromEntries(
      Object.entries(profiles ?? {}).map(([k, v]) => [k, Number(v) || 0])
    );
    const derived: Record<FlowLabel, number> = {
      "Catalyst Coaching Flow": 0,
      "Communications Coaching Flow": 0,
      "Rhythmic Coaching Flow": 0,
      "Observer Coaching Flow": 0,
    };
    for (const [code, score] of Object.entries(original)) {
      const flow = PROFILE_TO_FLOW[code];
      if (flow) derived[flow] = (derived[flow] ?? 0) + score;
    }
    return derived as Record<string, number>;
  }, [flows, profiles]);

  const profData = useMemo(() => normalize(profNamed), [profNamed]);
  const flowData = useMemo(() => normalize(flowRec), [flowRec]);

  const main = profData[0];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Coaching Flow</h3>
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
