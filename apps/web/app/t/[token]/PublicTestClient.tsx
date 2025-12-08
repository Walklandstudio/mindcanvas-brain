'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Question = {
  id: string;
  idx?: number | null;
  order?: number | null;
  type?: string | null;
  text?: string; // make optional – some tests may not have this shaped identically
  options?: string[] | null;
  category?: 'scored' | 'qual' | string | null;
};

type AnswersMap = Record<string, number>;
type Step = 'details' | 'questions';

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = (await r.text()).slice(0, 600);
    throw new Error(`HTTP ${r.status} – non-JSON response:\n${text}`);
  }
  const j = await r.json();
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

export default function PublicTestClient({ token }: { token: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [testName, setTestName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<Step>('details');

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});

  // details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [takerId, setTakerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // bootstrap: load link meta + questions
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');

        // 1) Link meta
        const metaRes: any = await fetchJson(`/api/public/test/${token}`);
        if (!alive) return;

        const metaData = metaRes?.data ?? {};
        const nameFromMeta: string | null = metaData?.name ?? null;

        const orgNameFromMeta: string | null =
          metaData?.org_name ??
          metaData?.organisation_name ??
          metaData?.org?.name ??
          null;

        setTestName(nameFromMeta);

        // 🔔 Notify TestShell so it can update the hero title
        if (typeof window !== 'undefined') {
          const detail = {
            orgName: orgNameFromMeta,
            testName: nameFromMeta,
          };
          window.dispatchEvent(new CustomEvent('mc_test_meta', { detail }));
        }

        // 2) Questions
        const qRes: any = await fetchJson(`/api/public/test/${token}/questions`);
        if (!alive) return;

        const list: Question[] = Array.isArray(qRes?.questions)
          ? qRes.questions
          : [];
        setQuestions(list);

        // 3) Restore local state (answers, details, taker_id)
        const key = (k: string) => `mc_${k}_${token}`;
        if (typeof window !== 'undefined') {
          const savedAns = window.localStorage.getItem(key('answers'));
          if (savedAns) {
            try {
              setAnswers(JSON.parse(savedAns));
            } catch {
              // ignore
            }
          }

          const d = window.localStorage.getItem(key('details'));
          if (d) {
            try {
              const o = JSON.parse(d);
              setFirstName(o.firstName || '');
              setLastName(o.lastName || '');
              setEmail(o.email || '');
              setPhone(o.phone || '');
              setCompany(o.company || '');
              setRoleTitle(o.roleTitle || '');
              setDataConsent(Boolean(o.dataConsent));
            } catch {
              // ignore
            }
          }

          const tid = window.localStorage.getItem(key('taker_id'));
          if (tid) setTakerId(tid);
        }

        setStarted(true);
      } catch (e: any) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // persist answers & details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `mc_answers_${token}`,
        JSON.stringify(answers)
      );
    }
  }, [answers, token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `mc_details_${token}`,
        JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          company,
          roleTitle,
          dataConsent,
        })
      );
    }
  }, [firstName, lastName, email, phone, company, roleTitle, dataConsent, token]);

  const q = questions[i];

  const allAnswered = useMemo(
    () =>
      questions.length > 0 &&
      questions.every((qq) => Number(answers[qq.id]) >= 1),
    [questions, answers]
  );

  const setChoice = (qid: string, val: number) =>
    setAnswers((a) => ({ ...a, [qid]: val }));

  const validateDetails = (): string | null => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();

    if (!fn || !ln || !em) {
      return 'Please fill in your first name, last name, and email to begin.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(em)) {
      return 'Please enter a valid email address.';
    }

    if (!dataConsent) {
      return 'Please confirm that you agree to the use of your data before starting.';
    }

    return null;
  };

  const proceedToQuestions = async () => {
    const validationError = validateDetails();
    if (validationError) {
      setDetailsError(validationError);
      return;
    }

    try {
      setSavingDetails(true);
      setError('');
      setDetailsError(null);

      const res: any = await fetchJson(`/api/public/test/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          email: email.trim().toLowerCase() || null,
          phone: phone || null,
          company: company || null,
          role_title: roleTitle || null,
          // Store consent flag for this taker
          data_consent: true,
        }),
      });

      const tid = res?.id;
      if (!tid) throw new Error('Failed to create taker');

      setTakerId(tid);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`mc_taker_id_${token}`, tid);
      }

      setStep('questions');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSavingDetails(false);
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      setError('');

      if (!takerId) throw new Error('missing taker_id');

      // ✅ send { question_id, selected } (0-based index)
      const payloadAnswers = Object.entries(answers).map(
        ([question_id, value]) => ({
          question_id,
          selected: Number(value) - 1, // backend expects 0..3
        })
      );

      const res = await fetch(`/api/public/test/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taker_id: takerId, answers: payloadAnswers }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false)
        throw new Error(j?.error || `HTTP ${res.status}`);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`mc_answers_${token}`);
      }

      router.replace(`/t/${token}/result?tid=${encodeURIComponent(takerId)}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen mc-bg text-white p-6">
        <h1 className="text-2xl font-semibold">Loading…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen mc-bg text-white p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Couldn’t load test</h1>
        <pre className="p-3 rounded bg-white text-black whitespace-pre-wrap border">
          {error}
        </pre>
        <div className="text-white/70 text-sm">
          Debug:
          <ul className="list-disc ml-5 mt-2">
            <li>
              <a
                className="underline"
                href={`/api/public/test/${token}`}
                target="_blank"
              >
                /api/public/test/{token}
              </a>
            </li>
            <li>
              <a
                className="underline"
                href={`/api/public/test/${token}/questions`}
                target="_blank"
              >
                /api/public/test/{token}/questions
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const noQuestions = questions.length === 0 || !q;
  const canProceedDetails =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    dataConsent &&
    !savingDetails;

  return (
    <div className="min-h-screen mc-bg text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">{testName || 'Profile Test'}</h1>
      <div className="text-white/70">
        Token:{' '}
        <code className="text-white">
          {token}
        </code>{' '}
        • {started ? 'started' : 'not started'}
      </div>

      {step === 'details' ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 max-w-2xl space-y-4">
          <div className="text-lg font-semibold">
            Before we start, tell us about you
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-white/80">First name *</span>
              <input
                className="w-full rounded-xl bg-white text-black p-3 mt-1"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setDetailsError(null);
                }}
              />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Last name *</span>
              <input
                className="w-full rounded-xl bg-white text-black p-3 mt-1"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setDetailsError(null);
                }}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">Email *</span>
              <input
                type="email"
                className="w-full rounded-xl bg-white text-black p-3 mt-1"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setDetailsError(null);
                }}
              />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Phone (optional)</span>
              <input
                className="w-full rounded-xl bg-white text-black p-3 mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Company (optional)</span>
              <input
                className="w-full rounded-xl bg-white text-black p-3 mt-1"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">
                Role / Department (optional)
              </span>
              <input
                className="w-full rounded-xl bg-white text-black p-3 mt-1"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </label>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/15 p-3 flex flex-col gap-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={dataConsent}
                onChange={(e) => {
                  setDataConsent(e.target.checked);
                  setDetailsError(null);
                }}
              />
              <span className="text-sm text-white/90">
                I agree that my responses can be used to build my profile and
                report.
              </span>
            </label>
            <p className="text-xs text-white/70">
              You can read our{' '}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms" className="underline">
                Terms &amp; Conditions
              </a>{' '}
              for more details on how we handle your data.
            </p>
          </div>

          {detailsError && (
            <p className="text-sm text-red-300">{detailsError}</p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              onClick={proceedToQuestions}
              disabled={!canProceedDetails}
              className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60"
            >
              {savingDetails ? 'Saving…' : 'Start the test'}
            </button>
          </div>
        </div>
      ) : noQuestions ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 max-w-2xl">
          <div className="text-lg font-semibold mb-2">
            This test isn&apos;t configured with any questions yet
          </div>
          <p className="text-sm text-white/70">
            The link is valid, but no question set was found for this test. If
            you believe this is an error, please contact the organiser or
            MindCanvas support so they can add questions to this assessment.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-white/60 mb-2">
              Question {i + 1} / {questions.length}
              {q.category && (
                <span className="ml-2 uppercase text-[11px] px-2 py-0.5 rounded bg-white/10">
                  {q.category}
                </span>
              )}
            </div>
            <div className="text-lg font-medium mb-4">
              {q.text || `Question ${i + 1}`}
            </div>

            {Array.isArray(q.options) && q.options.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((label: string, idx: number) => {
                  const val = idx + 1;
                  const selected = answers[q.id] === val;
                  return (
                    <button
                      key={idx}
                      onClick={() => setChoice(q.id, val)}
                      className={[
                        'text-left px-3 py-3 rounded-xl border transition',
                        selected
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 border-white/20 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setChoice(q.id, val)}
                    className={[
                      'px-3 py-3 rounded-xl border transition',
                      answers[q.id] === val
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 border-white/20 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify_between">
            <button
              onClick={() => setI(Math.max(0, i - 1))}
              disabled={i === 0}
              className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              Previous
            </button>

            {i < questions.length - 1 ? (
              <button
                onClick={() =>
                  setI(Math.min(questions.length - 1, i + 1))
                }
                className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60"
                disabled={!answers[q.id]}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!allAnswered || submitting}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit & View Report'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}



