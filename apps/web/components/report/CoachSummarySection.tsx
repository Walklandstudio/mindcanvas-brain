'use client';

type CoachSummarySectionProps = {
  summary: string;
};

export function CoachSummarySection({ summary }: CoachSummarySectionProps) {
  // Split on blank lines into paragraphs for nicer reading
  const paragraphs = summary
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <h2 className="text-lg font-semibold text-slate-900">Coach summary</h2>
      <p className="mt-1 text-sm text-slate-500">
        A short, coach-ready summary you can use to frame development
        conversations.
      </p>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
        {paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </div>
    </div>
  );
}
