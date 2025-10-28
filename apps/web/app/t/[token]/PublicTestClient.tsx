'use client';

import { useEffect, useMemo, useState } from 'react';

type Question = {
  id: string;
  idx?: number | null;
  order?: number | null;
  type?: string | null;          // e.g. 'radio'
  text: string;
  options?: string[] | null;     // array of option labels
  category?: 'scored' | 'qual' | string | null;
};

type Answers = Record<string, number>; // questionId -> 1..N (index into options array)

export default function PublicTestClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [testName, setTestName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function fetchJson(url: string, init?: RequestInit) {
    const r = await fetch(url, init);
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = (await r.text()).slice(0, 600);
      throw new Error(`HTTP ${r.status} – non-JSON response:\n${text}`);
    }
    const j = await r.json();
    if (!r.ok || j?.ok === false) {
      throw new Error(j?.error || `HTTP ${r.status}`);
    }
    return j;
  }

  // kick off session and load questions
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');

        // Start (idempotent)
        await fetchJson(`/api/public/test/${token}/start`, { method: 'POST' });
        if (!alive) return;
        setStarted(true);

        // Load questions (optionally supports { test_name })
        const qRes: any = await fetchJson(`/api/public/test/${token}/questions`);
        if (!alive) return;

        setTestName(typeof qRes?.test_name === 'string' ? qRes.test_name : null);
        const list: Question[] = Array.isArray(qRes?.questions) ? qRes.questions : [];
        setQuestions(list);

        // restore local answers (nice for refresh/back)
        const saved = typeof window !== 'undefined'
          ? window.localStorage.getItem(`mc_answers_${token}`)
          : null;
        if (saved) {
          try { setAnswers(JSON.parse(saved)); } catch {}
        }
      } catch (e: any) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // persist answers locally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`mc_answers_${token}`, JSON.stringify(answers));
    }
  }, [answers, token]);

  const q = questions[i];
  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every(qq => Number(answers[qq.id]) >= 1),
    [questions, answers]
  );

  const setChoice = (qid: string, val: number) => {
    setAnswers(a => ({ ...a, [qid]: val }));
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`/api/public/test/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
      setDone(true);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`mc_answers_${token}`);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------ UI ------------- */

  if (loading) {
    return (
      <div className="min-h-screen mc-bg text-white p-6">
        <h1 className="text-2xl font-semibold">Loading test…</h1>
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
          Debug links:
          <ul className="list-disc ml-5 mt-2">
            <li><a className="underline" href={`/api/public/test/${token}/start`} target="_blank">/api/public/test/{token}/start</a></li>
            <li><a className="underline" href={`/api/public/test/${token}/questions`} target="_blank">/api/public/test/{token}/questions</a></li>
          </ul>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen mc-bg text-white p-6 space-y-4">
        <h1 className="text-3xl font-bold">Thanks!</h1>
        <p className="text-white/80">Your responses have been submitted.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen mc-bg text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">{testName || 'Public Test'}</h1>
      <div className="text-white/70">
        Token: <code className="text-white">{token}</code> • {started ? 'started' : 'not started'}
      </div>

      {questions.length === 0 ? (
        <div className="text-white/70">No questions configured for this test.</div>
      ) : (
        <>
          {/* Question card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-white/60 mb-2">
              Question {i + 1} / {questions.length}
              {q?.category && <span className="ml-2 uppercase text-[11px] px-2 py-0.5 rounded bg-white/10">{q.category}</span>}
            </div>
            <div className="text-lg font-medium mb-4">{q.text}</div>

            {/* Prefer text options (radio list). Fallback to 1..5 if none. */}
            {Array.isArray(q.options) && q.options.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((label, idx) => {
                  const val = idx + 1; // store 1..N
                  const selected = answers[q.id] === val;
                  return (
                    <button
                      key={idx}
                      onClick={() => setChoice(q.id, val)}
                      className={[
                        'text-left px-3 py-3 rounded-xl border transition',
                        selected
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
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
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                    ].join(' ')}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav + Submit */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setI(Math.max(0, i - 1))}
              disabled={i === 0}
              className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              Previous
            </button>

            {i < questions.length - 1 ? (
              <button
                onClick={() => setI(Math.min(questions.length - 1, i + 1))}
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
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
