// @ts-nocheck
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Props = { data: Record<string, number> };

export default function ProfileBar({ data }: Props) {
  const rows = Object.entries(data).map(([k, v]) => ({ name: k, value: v ?? 0 }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
