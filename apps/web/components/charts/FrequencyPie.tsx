// @ts-nocheck
"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type Props = { data: { A: number; B: number; C: number; D: number } };

export default function FrequencyPie({ data }: Props) {
  const rows = [
    { name: "A", value: data.A ?? 0 },
    { name: "B", value: data.B ?? 0 },
    { name: "C", value: data.C ?? 0 },
    { name: "D", value: data.D ?? 0 }
  ];
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" outerRadius={100}>
            {rows.map((_, i) => (
              <Cell key={i} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
