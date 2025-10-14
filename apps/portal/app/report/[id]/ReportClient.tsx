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
import PdfButton from "./PdfButton";
import clsx from "clsx";

type Row = { name: string; value: number };
type AnyRecord = Record<string, any>;

/** Props compatible with both usages:
 *  - old: <ReportClient id="..." rows={[...]}/>
 *  - new: <ReportClient reportId="..." data={...}/>
 */
type Props = {
  // “new” shape used by page.tsx
  data?: AnyRecord;
  reportId?: string;

  // “old”/alternate shape
  id?: string;
  rows?: Row[];
  title?: string;

  className?: string;
};

export default function ReportClient(props: Props) {
  // Prefer the new props coming from page.tsx
  const dataObj: AnyRecord | undefined = props.data;
  const id =
    props.reportId ??
    props.id ??
    (typeof dataObj?.id === "string" ? dataObj.id : undefined);

  const title: string =
    props.title ??
    (typeof dataObj?.title === "string" ? dataObj.title : "Report");

  // Try to pull chart rows from various possible shapes
  const rowsFromData: Row[] | undefined = Array.isArray(dataObj?.rows)
    ? (dataObj!.rows as Row[])
    : Array.isArray(dataObj?.chartRows)
    ? (dataObj!.chartRows as Row[])
    : undefined;

  const data: Row[] =
    props.rows && props.rows.length
      ? props.rows
      : rowsFromData && rowsFromData.length
      ? rowsFromData
      : [
          // fallback demo data so the UI still renders
          { name: "Discover", value: 24 },
          { name: "Define", value: 38 },
          { name: "Design", value: 22 },
          { name: "Deliver", value: 16 },
        ];

  return (
    <section className={clsx("w-full space-y-4", props.className)}>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        {id ? <PdfButton id={id}>Download PDF</PdfButton> : null}
      </header>

      <div className="h-64 w-full rounded-2xl border border-white/10 bg-white/5 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 16, right: 16 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="name" width={160} />
            {/* Recharts v3 typing: accept unknown and coerce */}
            <Tooltip formatter={(value: unknown) => `${Number(value ?? 0)}%`} />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} isAnimationActive>
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
