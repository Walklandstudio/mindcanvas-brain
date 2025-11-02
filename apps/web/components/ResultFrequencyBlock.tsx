// apps/web/components/ResultFrequencyBlock.tsx
'use client';

import * as React from 'react';

type AB = 'A' | 'B' | 'C' | 'D';

type Label = { code: AB; name: string };
type Pct = Record<AB, number>;
type Score = Record<AB, number>;

export default function ResultFrequencyBlock({
  labels,
  percentages,
  scores,
  title = 'Coaching Flow mix',
}: {
  labels: Label[];
  percentages: Pct;      // 0..1
  scores: Score;         // 0..10
  title?: string;
}) {
  // Preserve A,B,C,D order:
  const order: AB[] = ['A', 'B', 'C', 'D'];
  const labelByCode = new Map<AB, string>(
    labels.map((l) => [l.code, l.name || l.code])
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-3">
        {order.map((code) => {
          const name = labelByCode.get(code) || code;
          const pct = Math.max(0, Math.min(1, Number(percentages[code] ?? 0)));
          const score = Number(scores[code] ?? 0);

          return (
            <div key={code} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-sm text-gray-700">
                {name} <span className="text-gray-500">({code})</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
              <div className="w-28 shrink-0 text-right text-sm tabular-nums">
                {(pct * 100).toFixed(0)}%
              </div>
              <div className="w-16 shrink-0 text-right text-sm font-medium text-gray-800">
                {score}/10
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
