'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Option = {
  id: string;
  label: string;
  // optional scoring metadata (server decides what to do with it)
  points?: number | null;
  profileCode?: string | null;
  frequency?: 'A' | 'B' | 'C' | 'D' | null;
};

type Question = {
  id: string;
  index: number; // 1..n for ordering
  text: string;
  type: 'single' | 'multi' | 'info';
  options: Option[];
  // if false, still render but don't block progress
  isScored: boolean;
};

type LoadedSubmission = {
  submissionId: string;
  testSlug: string;
  questions: Question[];
  answers: Record<string, string | string[]>; // questionId -> optionId(s)
  finished?: boolean;
};

async function startSubmission(slug: string): Promise<LoadedSubmission> {
  const res = await fetch(`/api/submissions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to start submission: ${t}`);
  }
  return res.json();
}

async function saveAnswerAPI(submissionId: string, questionId: string, optionIdOrIds: string | string[]) {
  const res = await fetch(`/api/submissions/${submissionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, optionId: optionIdOrIds }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to save answer: ${t}`);
  }
  return res.json();
}

async function finishAPI(submissionId: string) {
  const res = await fetch(`/api/submissions/${submissionId}/finish`, {
    method: 'POST',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to finish: ${t}`);
  }
  return res.json() as Promise<{ reportId: string }>;
}

export default function TestPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { slug } = params;

  const [sub, setSub] = useState<LoadedSubmission | null>(null);
  const [current, setCurrent] = useState(0);
  const [saving, startSaving] = useTransition();
  const [finishing, startFinishing] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    (async () => {
      try {
        const s = await startSubmission(slug);
        setSub(s);
        // if resumed and we have partial answers, jump to first unanswered
        if (s.questions?.length) {
          const idx = s.questions.findIndex(q => {
            const a = s.answers?.[q.id];
            if (q.type === 'multi') return !Array.isArray(a) || a.length === 0;
            return !a;
          });
          setCurrent(idx === -1 ? 0 : idx);
        }
      } catch (e: any) {
        setError(e?.message || 'Could not start the test.');
      }
    })();
  }, [slug]);

  const questions = sub?.questions ?? [];
  const total = questions.length;

  const answeredCount = useMemo(() => {
    if (!sub) return 0;
    return questions.reduce((acc, q) => {
      const a = sub.answers?.[q.id];
      if (q.type === 'multi') return acc + (Array.isArray(a) && a.length > 0 ? 1 : 0);
      return acc + (a ? 1 : 0);
    }, 0);
  }, [sub, questions]);

  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  function onSingleSelect(question: Question, optionId: string) {
    if (!sub) return;
    setSub(prev => {
      if (!prev) return prev;
      const next = { ...prev, answers: { ...prev.answers, [question.id]: optionId } };
      return next;
    });

    // persist to API (optimistic)
    startSaving(async () => {
      try {
        await saveAnswerAPI(sub.submissionId, question.id, optionId);
      } catch (e: any) {
        setError(e?.message || 'Save failed. Trying again…');
      }
    });
  }

  function onMultiToggle(question: Question, optionId: string) {
    if (!sub) return;
    setSub(prev => {
      if (!prev) return prev;
      const existing = prev.answers?.[question.id];
      const arr = Array.isArray(existing) ? existing.slice() : [];
      const i = arr.indexOf(optionId);
      if (i === -1) arr.push(optionId);
      else arr.splice(i, 1);
      return { ...prev, answers: { ...prev.answers, [question.id]: arr } };
    });

    startSaving(async () => {
      try {
        const val = sub.answers?.[question.id];
        const arr = Array.isArray(val) ? val : [];
        await saveAnswerAPI(sub.submissionId, question.id, arr);
      } catch (e: any) {
        setError(e?.message || 'Save failed. Trying again…');
      }
    });
  }

  function next() {
    setCurrent(i => Math.min(i + 1, total - 1));
  }
  function prev() {
    setCurrent(i => Math.max(i - 1, 0));
  }

  function canAdvance(q: Question): boolean {
    // info-only questions don't block progress
    if (q.type === 'info' || !q.isScored) return true;
    const a = sub?.answers?.[q.id];
    if (q.type === 'multi') return Array.isArray(a) && a.length > 0;
    return !!a;
  }

  async function finish() {
    if (!sub) return;
    startFinishing(async () => {
      try {
        const { reportId } = await finishAPI(sub.submissionId);
        router.push(`/report/${reportId}`);
      } catch (e: any) {
        setError(e?.message || 'Could not finish. Please try again.');
      }
    });
  }

  const q = questions[current];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Competency Coach — Profile Test</h1>
          <p className="text-sm text-gray-500">Question {current + 1} of {total}</p>
        </div>
        <div className="w-40">
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-black transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-500">{progressPct}%</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {!sub && !error && (
        <div className="rounded-xl border px-4 py-8 text-center">Preparing your test…</div>
      )}

      {/* Question */}
      {sub && q && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">{q.index}. {q.text}</h2>

          {/* Single choice */}
          {q.type === 'single' && (
            <div className="space-y-3">
              {q.options.map(opt => {
                const selected = sub.answers?.[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onSingleSelect(q, opt.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      selected ? 'border-black bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi choice */}
          {q.type === 'multi' && (
            <div className="space-y-3">
              {q.options.map(opt => {
                const arr = sub.answers?.[q.id];
                const selected = Array.isArray(arr) && arr.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      selected ? 'border-black bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!selected}
                      onChange={() => onMultiToggle(q, opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Info-only text (no options) */}
          {q.type === 'info' && (
            <p className="text-gray-600">This question is informational and does not affect your profile.</p>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between">
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              onClick={prev}
              disabled={current === 0 || saving}
            >
              ← Back
            </button>

            <div className="flex items-center gap-3">
              {current < total - 1 ? (
                <button
                  className="rounded-xl bg-black px-5 py-2 text-sm text-white disabled:opacity-50"
                  onClick={next}
                  disabled={!canAdvance(q) || saving}
                >
                  {saving ? 'Saving…' : 'Next →'}
                </button>
              ) : (
                <button
                  className="rounded-xl bg-black px-5 py-2 text-sm text-white disabled:opacity-50"
                  onClick={finish}
                  disabled={finishing}
                >
                  {finishing ? 'Finishing…' : 'Finish & View Report'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <p className="mt-6 text-center text-xs text-gray-500">
        Your choices are saved automatically. You can refresh without losing progress.
      </p>
    </div>
  );
}




