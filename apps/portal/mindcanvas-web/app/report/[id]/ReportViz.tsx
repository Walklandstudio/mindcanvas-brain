'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

export type ProfileCode = 'P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7'|'P8';
export type FlowLabel = 'Catalyst'|'Communications'|'Rhythmic'|'Observer';

export interface ResultPayload {
  profiles: Record<ProfileCode, number>;
  flows: Record<FlowLabel, number>;
  total: number;
  winner: { profileCode: ProfileCode; flow: FlowLabel };
  percentages: {
    profiles: Record<ProfileCode, number>;
    flows: Record<FlowLabel, number>;
  };
}

export interface ReportVizProps {
  result: ResultPayload;
  profileLabels?: Partial<Record<ProfileCode, string>>;
  flowColors?: Partial<Record<FlowLabel, string>>;
  profileColors?: Partial<Record<ProfileCode, string>>;
}

const ALL_PROFILES: ProfileCode[] = ['P1','P2','P3','P4','P5','P6','P7','P8'];
const ALL_FLOWS: FlowLabel[] = ['Catalyst','Communications','Rhythmic','Observer'];

const DEFAULT_FLOW_COLORS: Record<FlowLabel, string> = {
  Catalyst: '#9b5de5',
  Communications: '#f15bb5',
  Rhythmic: '#00bbf9',
  Observer: '#00f5d4',
};

const DEFAULT_PROFILE_COLORS: Record<ProfileCode, string> = {
  P1: '#9b5de5', P2: '#f15bb5', P3: '#fee440', P4: '#00bbf9',
  P5: '#00f5d4', P6: '#277da1', P7: '#577590', P8: '#4d908e',
};

const DEFAULT_PROFILE_LABELS: Record<ProfileCode, string> = {
  P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4', P5: 'P5', P6: 'P6', P7: 'P7', P8: 'P8',
};

function num(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function zeroedProfiles(source?: Partial<Record<ProfileCode, number>>): Record<ProfileCode, number> {
  return ALL_PROFILES.reduce((acc, code) => {
    acc[code] = num(source?.[code], 0);
    return acc;
  }, {} as Record<ProfileCode, number>);
}

function zeroedFlows(source?: Partial<Record<FlowLabel, number>>): Record<FlowLabel, number> {
  return ALL_FLOWS.reduce((acc, key) => {
    acc[key] = num(source?.[key], 0);
    return acc;
  }, {} as Record<FlowLabel, number>);
}

/** Recharts tooltip formatters are loosely typed; use unknown-friendly signatures. */
function tooltipValuePercent(value: unknown): string {
  return `${num(value, 0)}%`;
}
function flowTooltipFormatter(value: unknown, name: string): [string, string] {
  return [tooltipValuePercent(value), name];
}
function profileTooltipFormatter(value: unknown): string {
  return tooltipValuePercent(value);
}
function labelFormatter(label: unknown): string {
  return `Profile: ${String(label)}`;
}

export default function ReportViz({
  result,
  profileLabels,
  flowColors,
  profileColors,
}: ReportVizProps) {
  const flowsPct = useMemo(() => zeroedFlows(result?.percentages?.flows), [result]);
  const profilesPct = useMemo(() => zeroedProfiles(result?.percentages?.profiles), [result]);

  const flowPieData = useMemo(
    () =>
      ALL_FLOWS.map((f) => ({
        name: f,
        value: num(flowsPct[f], 0),
        color: (flowColors?.[f] ?? DEFAULT_FLOW_COLORS[f]) as string,
      })),
    [flowsPct, flowColors]
  );

  const profileBarData = useMemo(() => {
    const rows = ALL_PROFILES.map((p) => ({
      code: p,
      label: profileLabels?.[p] ?? DEFAULT_PROFILE_LABELS[p],
      value: num(profilesPct[p], 0),
      color: (profileColors?.[p] ?? DEFAULT_PROFILE_COLORS[p]) as string,
    }));
    rows.sort((a, b) => (b.value - a.value) || a.code.localeCompare(b.code));
    return rows;
  }, [profilesPct, profileLabels, profileColors]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ----- Flow Pie ----- */}
      <div className="rounded-2xl border p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Your Coaching Flow</h3>
        <div className="w-full h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={flowPieData}
                dataKey="value"
                nameKey="name"
                cy="50%"
                cx="50%"
                outerRadius="80%"
                isAnimationActive={false}
              >
                {flowPieData.map((entry, idx) => (
                  <Cell key={`flow-cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <ReTooltip formatter={flowTooltipFormatter} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ----- Profiles Bar ----- */}
      <div className="rounded-2xl border p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Profile Breakdown</h3>
        <div className="w-full h-80">
          <ResponsiveContainer>
            <BarChart data={profileBarData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${num(v, 0)}%`} />
              <ReTooltip formatter={profileTooltipFormatter} labelFormatter={labelFormatter} />
              <Legend />
              <Bar dataKey="value" name="Percent">
                {profileBarData.map((row, idx) => (
                  <Cell key={`pbar-cell-${idx}`} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
