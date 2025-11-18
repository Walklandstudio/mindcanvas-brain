// apps/web/app/t/[token]/report/CoachSummarySection.tsx

import type { CoachSummary } from '@/lib/report/buildCoachSummary';

type Props = {
  summary: CoachSummary;
};

export default function CoachSummarySection({ summary }: Props) {
  if (!summary) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">
        Coach summary
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Use this as a quick starting point for coaching or one-to-one
        conversations. It highlights themes that are usually most useful
        to explore with this profile.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          {summary.headline}
        </p>

        {summary.bullets.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {summary.bullets.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
