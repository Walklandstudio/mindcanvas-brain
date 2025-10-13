"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import clsx from "clsx";

type Row = { name: string; value: number };

type Props = {
  className?: string;
  /** If not provided, a tiny demo dataset is used so the chart still renders. */
  flowRows?: Row[];
  title?: string;
};

export default function ClientDetailClient({
  className,
  flowRows,
  title = "Flow distribution",
}: Props) {
  const data: Row[] =
    flowRows && flowRows.length
      ? flowRows
      : [
          { name: "Discover", value: 24 },
          { name: "Define", value: 38 },
          { name: "Design", value: 22 },
          { name: "Deliver", value: 16 },
        ];

  return (
    <section className={clsx("w-full", className)}>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>

      <div className="h-64 w-full rounded-2xl border border-white/10 bg-white/5 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 16, right: 16 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="name" width={160} />
            {/* Recharts v3 is strict about formatter types; accept unknown and coerce */}
            <Tooltip formatter={(value: unknown) => `${Number(value ?? 0)}%`} />
            <Bar dataKey="value" radius={[6, 6, 6, 6]}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(label: unknown) => `${Number(label ?? 0)}%`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
