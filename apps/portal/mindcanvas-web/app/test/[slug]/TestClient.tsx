'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/* ---------- Types ---------- */
type Frequency = 'A' | 'B' | 'C' | 'D';

type Option = {
  id: string;
  label: string;
  points: number | null;
  profileCode: string | null;
  frequency: Frequency | null;
};

type QuestionType = 'single' | 'multi' | 'info';

type Question = {
  id: string;
  index: number; // 1..n
  text: string;
  type: QuestionType;
  isScored: boolean;
  options: Option[];
};

type LoadedSubmission = {
  submissionId: string;
  testSlug: string;
  questions: Question[];
  answers: Record<string, string | string[] | undefined>;
  finished?: boolean;
};

type FinishResponse = { reportId: string };
type Contact = { name: string | null; email: string | null; phone: string | null };

/* ---------- Utils ---------- */
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

function splitName(full?: string | null): { first: string; last: string } {
  const s = (full ?? '').trim();
  if (!s) return { first: '', last: '' };
  const parts = s.split(/\s+/);
  return parts.length === 1
    ? { first: parts[0], last: '' }
    : { first: parts[0], last: parts.slice(1).join(' ') };
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/* ---------- API ---------- */
async function startSubmission(slug: string): Promise<LoadedSubmission> {
  const res = await fetch('/api/submissions/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LoadedSubmission;
}

async function resumeSubmission(submissionId: string): Promise<LoadedSubmission> {
  const res = await fetch(`/api/submissions/${submissionId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LoadedSubmission;
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
  if (!res.ok) throw new Error(await res.text());
}

async function finishAPI(submissionId: string): Promise<FinishResponse> {
  const res = await fetch(`/api/submissions/${submissionId}/finish`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as FinishResponse;
}

async function getContact(submissionId: string): Promise<Contact> {
  const res = await fetch(`/api/submissions/${submissionId}/contact`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Contact;
}

async function saveContact(submissionId: string, c: Contact): Promise<void> {
  const res = await fetch(`/api/submissions/${submissionId}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  });
  if (!res.ok) throw new Error(await res.text());
}

/* ---------- Component ---------- */
export default function TestClient({
  slug,
  sid,
  prefill,
}: {
  slug: string;
  sid?: string;
  prefill?: { name?: string; email?: string; phone?: string };
}) {
  const router = useRouter();

  const [sub, setSub] = useState<LoadedSubmission | null>(null);
  const [current, setCurrent] = useState(0);
  const [saving, startSaving] = useTransition();
  const [finishing, startFinishing] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Contact state (required)
  const initial = splitName(prefill?.name);
  const [first, setFirst] = useState(initial.first);
  const [last, setLast] = useState(initial.last);
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [contactSaved, setContactSaved] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);

  // Load/start once (based on slug/sid)
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    (async () => {
      try {
        const s = sid ? await resumeSubmission(sid) : await startSubmission(slug);
        setSub(s);

        // Existing contact (if any)
        try {
          const c = await getContact(s.submissionId);
          if (c) {
            const { first: f, last: l } = splitName(c.name);
            if (f || l || c.email || c.phone) {
              setFirst(f);
              setLast(l);
              setEmail(c.email ?? '');
              setPhone(c.phone ?? '');
              setContactSaved(true);
            }
          }
        } catch (e) {
          // Non-fatal
          console.warn('Contact load error:', getErrorMessage(e));
        }

        // Jump to first unanswered
        if (s.questions?.length) {
          const idx = s.questions.findIndex(q => {
            const a = s.answers?.[q.id];
            if (q.type === 'multi') return !(Array.isArray(a) && a.length > 0);
            return !a;
          });
          setCurrent(idx === -1 ? 0 : idx);
        }
      } catch (e) {
        setError(`Failed to load submission: ${getErrorMessage(e)}`);
      }
    })();
  }, [slug, sid]);

  // Stable questions ref
  const questions = useMemo<Question[]>(() => sub?.questions ?? [], [sub?.questions]);
  const total = questions.length;
  const q = questions[current];

  // Progress
  const answeredCount = useMemo(() => {
    if (!sub) return 0;
    return questions.reduce((acc, qq) => {
      const a = sub.answers?.[qq.id];
      if (qq.type === 'multi') return acc + (Array.isArray(a) && a.length > 0 ? 1 : 0);
      return acc + (typeof a === 'string' && a.length > 0 ? 1 : 0);
    }, 0);
  }, [sub, questions]);
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  // Require first + last + phone + valid email
  const contactValid = useMemo(
    () =>
      first.trim().length > 0 &&
      last.trim().length > 0 &&
      phone.trim().length > 0 &&
      isValidEmail(email.trim()),
    [first, last, email, phone],
  );

  // Answer handlers
  const onSingleSelect = useCallback(
    (question: Question, optionId: string) => {
      if (!sub) return;
      setSub(prev => (prev ? { ...prev, answers: { ...prev.answers, [question.id]: optionId } } : prev));
      startSaving(() => {
        saveAnswerAPI(sub.submissionId, question.id, optionId).catch(e =>
          setError(getErrorMessage(e)),
        );
      });
    },
    [sub],
  );

  const onMultiToggle = useCallback(
    (question: Question, optionId: string) => {
      if (!sub) return;

      let next: string[] = [];
      setSub(prev => {
        if (!prev) return prev;
        const existing = prev.answers?.[question.id];
        const arr = Array.isArray(existing) ? [...existing] : [];
        const i = arr.indexOf(optionId);
        if (i === -1) arr.push(optionId);
        else arr.splice(i, 1);
        next = arr;
        return { ...prev, answers: { ...prev.answers, [question.id]: arr } };
      });

      startSaving(() => {
        saveAnswerAPI(sub.submissionId, question.id, next).catch(e => setError(getErrorMessage(e)));
      });
    },
    [sub],
  );

  const next = useCallback(() => setCurrent(i => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent(i => Math.max(i - 1, 0)), []);

  function canAdvance(qq: Question): boolean {
    if (!contactSaved || !contactValid) return false;
    if (qq.type === 'info' || !qq.isScored) return true;
    const a = sub?.answers?.[qq.id];
    if (qq.type === 'multi') return Array.isArray(a) && a.length > 0;
    return typeof a === 'string' && a.length > 0;
  }

  const finish = useCallback(() => {
    if (!sub) return;
    startFinishing(() => {
      finishAPI(sub.submissionId)
        .then(({ reportId }) => router.push(`/report/${reportId}`))
        .catch(e => setError(getErrorMessage(e)));
    });
  }, [router, sub]);

  // Save contact
  async function onSaveContact() {
    if (!sub) return;
    setContactSaving(true);
    setError(null);
    try {
      await saveContact(sub.submissionId, {
        name: `${first.trim()} ${last.trim()}`.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      setContactSaved(true);
    } catch (e) {
      setError(`Failed to save details: ${getErrorMessage(e)}`);
    } finally {
      setContactSaving(false);
    }
  }

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
            <div
              className="h-2 rounded-full bg-black transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-500">{progressPct}%</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Contact (required) */}
      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-medium">Your details</div>
          <span className="text-xs text-gray-500">{contactSaved ? 'Saved' : 'Required'}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="First name"
            value={first}
            onChange={e => setFirst(e.target.value)}
          />
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Last name"
            value={last}
            onChange={e => setLast(e.target.value)}
          />
        <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        {!contactValid && (
          <p className="mt-2 text-xs text-amber-700">
            Please enter first name, last name, phone, and a valid email to begin.
          </p>
        )}

        <div className="mt-3 flex justify-end">
          <button
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={onSaveContact}
            disabled={!sub || contactSaving || !contactValid}
          >
            {contactSaving ? 'Saving…' : 'Save details'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          We use this to attach your report and let you revisit it later.
        </p>
      </div>

      {/* Loading */}
      {!sub && !error && (
        <div className="rounded-2xl border px-4 py-8 text-center">Preparing your test…</div>
      )}

      {/* No questions state */}
      {sub && total === 0 && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">No questions found</h2>
          <p className="text-sm text-gray-600">
            This test doesn’t have any questions attached yet. Please check the test’s question
            bank in Admin.
          </p>
        </div>
      )}

      {/* Question card (disabled until contact saved & valid) */}
      {sub && q && total > 0 && (
        <div
          className={`rounded-2xl border bg-white p-6 shadow-sm ${
            contactSaved && contactValid ? '' : 'opacity-60'
          }`}
          style={{ pointerEvents: contactSaved && contactValid ? 'auto' : 'none' }}
        >
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

          {q.type === 'info' && (
            <p className="text-gray-600">
              This question is informational and does not affect your profile.
            </p>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between">
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={prev}
              disabled={current === 0 || saving || !contactSaved || !contactValid}
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
                  disabled={finishing || !contactSaved || !contactValid}
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
