'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Question = {
  id: string;
  idx?: number | null;
  order?: number | null;
  type?: string | null;
  text: string;
  options?: string[] | null;
  category?: 'scored' | 'qual' | string | null;
};

type Answers = Record<string, number>;
type Step = 'details' | 'questions';

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const ct = r.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const payload = isJson ? await r.json().catch(() => ({})) : { text: await r.text().catch(() => '') };
  if (!r.ok || (isJson && payload?.ok === false)) {
    const msg = (isJson ? payload?.error : payload?.text) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return payload;
}

export default function PublicTestClient({ token }: { token: string }) {
  const router = useRouter();

  // ui
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string>('');

  // test state
  const [testName, setTestName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<Step>('details');
  const [started, setStarted] = useState(false);
  const [takerId, setTakerId] = useState<string | null>(null);

  // answers
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  // identity
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [company,   setCompany]   = useState('');
  const [roleTitle, setRoleTitle] = useState('');

  // flags
  const [submitting, setSubmitting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // restore local storage (details + answers)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const d = window.localStorage.getItem(`mc_details_${token}`);
      if (d) {
        const o = JSON.parse(d);
        setFirstName(o.firstName || '');
        setLastName(o.lastName || '');
        setEmail(o.email || '');
        setCompany(o.company || '');
        setRoleTitle(o.roleTitle || '');
      }
    } catch {}
    try {
      const saved = window.localStorage.getItem(`mc_answers_${token}`);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
  }, [token]);

  // persist local storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `mc_details_${token}`,
      JSON.stringify({ firstName, lastName, email, company, roleTitle })
    );
  }, [firstName, lastName, email, company, roleTitle, token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`mc_answers_${token}`, JSON.stringify(answers));
  }, [answers, token]);

  // helpers
  const q = questions[i];
  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every(qq => Number(answers[qq.id]) >= 1),
    [questions, answers]
  );
  const setChoice = (qid: string, val: number) => setAnswers(a => ({ ...a, [qid]: val }));

  // DETAILS -> create taker -> load questions
  const proceedToQuestions = async () => {
    setSavingDetails(true);
    setError('');
    try {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        throw new Error('Please enter first name, last name and a valid email.');
      }

      // 1) Create taker via /taker (NOT /start)
      const takerRes: any = await fetchJson(`/api/public/test/${token}/taker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          email:      email.trim(),
          company:    company.trim() || null,
          role_title: roleTitle.trim() || null,
        }),
      });
      const newTakerId = String(takerRes?.taker_id || '');
      if (!newTakerId) throw new Error('Missing taker_id from /taker');
      setTakerId(newTakerId);
      setStarted(true);

      // 2) Load questions AFTER taker exists
      setLoading(true);
      const qRes: any = await fetchJson(`/api/public/test/${token}/questions`);
      setTestName(typeof qRes?.test_name === 'string' ? qRes.test_name : null);
      const list: Question[] = Array.isArray(qRes?.questions) ? qRes.questions : [];
      setQuestions(list);
      setStep('questions');
      setI(0);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
      setSavingDetails(false);
    }
  };

  // submit
  const submit = async () => {
    try {
      setSubmitting(true);
      setError('');
      if (!takerId) {
        throw new Error('Missing taker_id. Please go back and start the test again.');
      }

      const payload = {
        taker_id: takerId,
        answers,
        // also send identity so server can patch/denormalize:
        first_name: firstName?.trim() || null,
        last_name:  lastName?.trim()  || null,
        email:      email?.trim()     || null,
        company:    company?.trim()   || null,
        role_title: roleTitle?.trim() || null,
      };

      const res = await fetch(`/api/public/test/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`mc_answers_${token}`);
      }
      router.replace(`/t/${token}/result`);
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
        <pre className="p-3 rounded bg-white text-black whitespace-pre-wrap border">{error}</pre>
        <div className="text-white/70 text-sm">
          Debug:
          <ul className="list-disc ml-5 mt-2">
            <li><a className="underline" href={`/api/public/test/${token}/taker`} target="_blank">/api/public/test/{token}/taker</a></li>
            <li><a className="underline" href={`/api/public/test/${token}/questions`} target="_blank">/api/public/test/{token}/questions</a></li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mc-bg text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">{testName || 'Test'}</h1>
      <div className="text-white/70">
        Token: <code className="text-white">{token}</code> • {started ? 'started' : 'not started'}
      </div>

      {step === 'details' ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 max-w-2xl">
          <div className="text-lg font-semibold mb-3">Before we start, tell us about you</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-white/80">First name</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Last name</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={lastName} onChange={e=>setLastName(e.target.value)} required />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-white/80">Email</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Company (optional)</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={company} onChange={e=>setCompany(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm text-white/80">Role / Department (optional)</span>
              <input className="w-full rounded-xl bg-white text-black p-3 mt-1" value={roleTitle} onChange={e=>setRoleTitle(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={proceedToQuestions} disabled={savingDetails} className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60">
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
            <div className="text-lg font-medium mb-4">{q?.text}</div>

            {Array.isArray(q?.options) && q.options.length > 0 ? (
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
                {[1,2,3,4,5].map((val: number) => {
                  const selected = answers[q!.id] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setChoice(q!.id, val)}
                      className={[
                        'px-3 py-3 rounded-xl border transition',
                        selected ? 'bg-white text-black border-white'
                                 : 'bg-white/5 border-white/20 hover:bg-white/10'
                      ].join(' ')}
                    >
                      {val}
                    </button>
                  );
                })}
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
                disabled={!q || !answers[q.id]}
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
