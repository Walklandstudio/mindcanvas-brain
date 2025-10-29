'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Question = {
  id: string;
  idx?: number | null;
  order?: number | null;
  type?: string | null;          // 'radio'
  text: string;
  options?: string[] | null;     // labels
  category?: 'scored' | 'qual' | string | null;
};

type Answers = Record<string, number>; // qid -> 1..N
type Step = 'details' | 'questions';

export default function PublicTestClient({ token }: { token: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [testName, setTestName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<Step>('details');

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  // details
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [company,     setCompany]     = useState('');
  const [roleTitle,   setRoleTitle]   = useState('');

  // taker id after creation
  const [takerId, setTakerId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

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

  // bootstrap: start + load questions
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');

        // idempotent start (creates a taker server-side for safety too)
        await fetchJson(`/api/public/test/${token}/start`, { method: 'POST' });
        if (!alive) return;
        setStarted(true);

        // load questions
        const qRes: any = await fetchJson(`/api/public/test/${token}/questions`);
        if (!alive) return;

        setTestName(typeof qRes?.test_name === 'string' ? qRes.test_name : null);
        const list: Question[] = Array.isArray(qRes?.questions) ? qRes.questions : [];
        setQuestions(list);

        // restore local state
        if (typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(`mc_answers_${token}`);
          if (saved) try { setAnswers(JSON.parse(saved)); } catch {}
          const d = window.localStorage.getItem(`mc_details_${token}`);
          if (d) {
            try {
              const o = JSON.parse(d);
              setFirstName(o.firstName || '');
              setLastName(o.lastName || '');
              setEmail(o.email || '');
              setPhone(o.phone || '');
              setCompany(o.company || '');
              setRoleTitle(o.roleTitle || '');
              setTakerId(o.takerId || null);
            } catch {}
          }
        }
      } catch (e: any) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // persist answers & details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`mc_answers_${token}`, JSON.stringify(answers));
    }
  }, [answers, token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `mc_details_${token}`,
        JSON.stringify({ firstName, lastName, email, phone, company, roleTitle, takerId })
      );
    }
  }, [firstName, lastName, email, phone, company, roleTitle, takerId, token]);

  const q = questions[i];
  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every(qq => Number(answers[qq.id]) >= 1),
    [questions, answers]
  );
  const setChoice = (qid: string, val: number) => setAnswers(a => ({ ...a, [qid]: val }));

  // 1) Save details and create the taker (returns taker_id)
  const proceedToQuestions = async () => {
    try {
      setSavingDetails(true);
      setError('');
      const payload = {
        first_name: firstName || null,
        last_name:  lastName  || null,
        email:      email     || null,
        phone:      phone     || null,
        company:    company   || null,
        role_title: roleTitle || null,
      };
      // This endpoint MUST respond with { ok:true, taker_id }
      const res: any = await fetchJson(`/api/public/test/${token}/taker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const id = res?.taker_id || res?.id || null;
      if (!id) throw new Error('Failed to establish taker_id');

      setTakerId(id);
      setStep('questions');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSavingDetails(false);
    }
  };

  // 2) Submit answers (includes taker_id to satisfy older compiled handlers)
  const submit = async () => {
    try {
      setSubmitting(true);
      setError('');

      // send answers in a flat array [{question_id, value}]
      const answersArray = Object.entries(answers).map(([qid, val]) => ({
        question_id: qid,
        value: val,
      }));

      const body: any = {
        taker_id: takerId || null,
        answers: answersArray,
        // pass details too (server will upsert snapshot if needed)
        first_name: firstName || null,
        last_name:  lastName  || null,
        email:      email     || null,
        phone:      phone     || null,
        company:    company   || null,
        role_title: roleTitle || null,
      };

      const res = await fetch(`/api/public/test/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`mc_answers_${token}`);
      }
      // prefer returned taker id if API provides one
      const tid = j?.taker_id || takerId;
      router.replace(`/t/${token}/result?tid=${encodeURIComponent(String(tid || ''))}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div className="min-h-screen mc-bg text-white p-6"><h1 className="text-2xl font-semibold">Loading…</h1></div>;
  }
  if (error) {
    return (
      <div className="min-h-screen mc-bg text-white p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Couldn’t load test</h1>
        <pre className="p-3 rounded bg-white text-black whitespace-pre-wrap border">{error}</pre>
        <div className="text-white/70 text-sm">
          Debug:
          <ul className="list-disc ml-5 mt-2">
            <li><a className="underline" href={`/api/public/test/${token}/start`} target="_blank">/api/public/test/{token}/start</a></li>
            <li><a className="underline" href={`/api/public/test/${token}/questions`} target="_blank">/api/public/test/{token}/questions</a></li>
            <li><a className="underline" href={`/api/public/test/${token}/taker`} target="_blank">/api/public/test/{token}/taker</a></li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mc-bg text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">{testName || 'Competency Coach'}</h1>
      <div className="text-white/70">
        Token: <code className="text-white">{token}</code> • {started ? 'started' : 'not started'} • Taker: {takerId ? <code>{takerId}</code> : '—'}
      </div>

      {step === 'details' ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 max-w-2xl">
          <div className="text-lg font-semibold mb-3">Before we start, tell us about you</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-white/80">First name</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={firstName} onChange={e=>setFirstName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Last name</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={lastName} onChange={e=>setLastName(e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">Email</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={email} onChange={e=>setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Company (optional)</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={company} onChange={e=>setCompany(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Role / Department (optional)</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={roleTitle} onChange={e=>setRoleTitle(e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">Phone (optional)</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={phone} onChange={e=>setPhone(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={proceedToQuestions}
              disabled={savingDetails}
              className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60"
            >
              {savingDetails ? 'Saving…' : 'Start the test'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Question card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-white/60 mb-2">
              Question {i + 1} / {questions.length}
              {q?.category && <span className="ml-2 uppercase text-[11px] px-2 py-0.5 rounded bg-white/10">{q.category}</span>}
            </div>
            <div className="text-lg font-medium mb-4">{q.text}</div>

            {/* Prefer text options; fallback to 1..5 */}
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
                        selected ? 'bg-white text-black border-white'
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
                {[1,2,3,4,5].map((val) => (
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
                {submitting ? 'Submitting…' : 'Submit & View Report'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
