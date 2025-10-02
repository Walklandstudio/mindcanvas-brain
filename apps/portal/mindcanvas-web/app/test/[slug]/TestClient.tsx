// app/test/[slug]/TestClient.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

type Frequency = 'A' | 'B' | 'C' | 'D';
type QuestionType = 'single' | 'multi' | 'info';

type Option = {
  id: string;
  label: string;
  points?: number | null;
  profileCode?: string | null;
  frequency?: Frequency | null;
};

type Question = {
  id: string;
  index: number;         // 1..n
  text: string;
  type: QuestionType;
  options: Option[];
  isScored: boolean;
};

type LoadedSubmission = {
  submissionId: string;
  testSlug: string;
  questions: Question[];
  answers: Record<string, string | string[] | undefined>;
  person?: { first_name?: string; last_name?: string; email?: string; phone?: string };
  finished?: boolean;
};

type StartSubmissionResponse = LoadedSubmission;
type FinishResponse = { reportId: string };

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

/** ---- API helpers (browser fetch) ---- **/
async function startSubmission(slug: string): Promise<StartSubmissionResponse> {
  const res = await fetch(`/api/submissions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to start submission: ${await res.text()}`);
  return (await res.json()) as StartSubmissionResponse;
}

async function saveAnswerAPI(
  submissionId: string,
  questionId: string,
  optionIdOrIds: string | string[],
): Promise<void> {
  const res = await fetch(`/api/submissions/${submissionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, optionId: optionIdOrIds }),
  });
  if (!res.ok) throw new Error(`Failed to save answer: ${await res.text()}`);
}

async function saveDetailsAPI(
  submissionId: string,
  person: { first_name: string; last_name: string; email: string; phone: string },
): Promise<void> {
  // If your project uses a different route, adjust here (e.g. PUT /api/submissions/:id)
  const res = await fetch(`/api/submissions/${submissionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person }),
  });
  if (!res.ok) throw new Error(`Failed to save details: ${await res.text()}`);
}

async function finishAPI(submissionId: string): Promise<FinishResponse> {
  const res = await fetch(`/api/submissions/${submissionId}/finish`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to finish: ${await res.text()}`);
  return (await res.json()) as FinishResponse;
}

/** ---- Component ---- **/
export default function TestClient({ slug }: { slug: string }) {
  const [sub, setSub] = useState<LoadedSubmission | null>(null);
  const [current, setCurrent] = useState(0);
  const [saving, startSaving] = useTransition();
  const [finishing, startFinishing] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // local contact fields
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    (async () => {
      try {
        const s = await startSubmission(slug);
        setSub(s);
        setFirst(s.person?.first_name ?? '');
        setLast(s.person?.last_name ?? '');
        setEmail(s.person?.email ?? '');
        setPhone(s.person?.phone ?? '');
        if (s.questions?.length) {
          const firstUnanswered = s.questions.findIndex(q => {
            const a = s.answers?.[q.id];
            if (q.type === 'multi') return !(Array.isArray(a) && a.length > 0);
            return !a;
          });
          setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered);
        }
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    })();
  }, [slug]);

  const questions = useMemo<Question[]>(() => sub?.questions ?? [], [sub?.questions]);
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
    // optimistic
    setSub(prev => {
      if (!prev) return prev;
      return { ...prev, answers: { ...prev.answers, [question.id]: optionId } };
    });
    startSaving(async () => {
      try {
        await saveAnswerAPI(sub.submissionId, question.id, optionId);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }

  function onMultiToggle(question: Question, optionId: string) {
    if (!sub) return;
    // optimistic local update
    setSub(prev => {
      if (!prev) return prev;
      const existing = prev.answers?.[question.id];
      const arr = Array.isArray(existing) ? [...existing] : [];
      const i = arr.indexOf(optionId);
      if (i === -1) arr.push(optionId);
      else arr.splice(i, 1);
      return { ...prev, answers: { ...prev.answers, [question.id]: arr } };
    });
    // persist based on latest state
    startSaving(async () => {
      try {
        const a = sub.answers?.[question.id];
        const arr = Array.isArray(a) ? a : [];
        await saveAnswerAPI(sub.submissionId, question.id, arr);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
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
    if (q.type === 'info' || !q.isScored) return true;
    const a = sub?.answers?.[q.id];
    if (q.type === 'multi') return Array.isArray(a) && a.length > 0;
    return typeof a === 'string' && a.length > 0;
  }

  function saveDetails() {
    if (!sub) return;
    if (!first || !last || !email || !phone) {
      setError('Please complete first name, last name, email and phone.');
      return;
    }
    setError(null);
    startSaving(async () => {
      try {
        await saveDetailsAPI(sub.submissionId, {
          first_name: first,
          last_name: last,
          email,
          phone,
        });
        setSub(prev => (prev ? { ...prev, person: { first_name: first, last_name: last, email, phone } } : prev));
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }

  async function finish() {
    if (!sub) return;
    startFinishing(async () => {
      try {
        const { reportId } = await finishAPI(sub.submissionId);
        window.location.assign(`/report/${reportId}`);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
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
          <p className="text-sm text-gray-500">
            Question {Math.min(current + 1, Math.max(total, 1))} of {Math.max(total, 1)}
          </p>
        </div>
        <div className="w-40">
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-black transition-all" style={{ width: `${progressPct}%` }} />
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

      {/* Contact block */}
      {sub && (
        <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Your details</h2>
            <span className="text-xs text-gray-400">Required</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input className="rounded-xl border px-3 py-2" placeholder="First name"
              value={first} onChange={(e) => setFirst(e.target.value)} />
            <input className="rounded-xl border px-3 py-2" placeholder="Last name"
              value={last} onChange={(e) => setLast(e.target.value)} />
            <input className="rounded-xl border px-3 py-2" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="rounded-xl border px-3 py-2" placeholder="Phone"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              We use this to attach your report and let you revisit it later.
            </p>
            <button
              onClick={saveDetails}
              disabled={saving}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      {sub && q && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">
            {q.index}. {q.text}
          </h2>

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

          {q.type === 'multi' && (
            <div className="space-y-3">
              {q.options.map(opt => {
                const a = sub.answers?.[q.id];
                const selected = Array.isArray(a) && a.includes(opt.id);
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

          {q.type === 'info' && (
            <p className="text-gray-600">
              This question is informational and does not affect your profile.
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
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

      <p className="mt-6 text-center text-xs text-gray-500">
        Your choices are saved automatically. You can refresh without losing progress.
      </p>
    </div>
  );
}

