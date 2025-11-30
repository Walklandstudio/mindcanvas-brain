'use client';

// apps/web/app/t/[token]/report/CoachSummarySection.tsx

type Props = {
  summary: string;
};

export default function CoachSummarySection({ summary }: Props) {
  if (!summary?.trim()) return null;

  // Split on blank lines so it reads nicely
  const paragraphs = summary
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <h2 className="text-lg font-semibold text-slate-900">Coach summary</h2>
      <p className="mt-1 text-sm text-slate-500">
        A short, coach-ready snapshot you can use to frame development conversations.
      </p>

      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
        {paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </div>
    </section>
  );
}
