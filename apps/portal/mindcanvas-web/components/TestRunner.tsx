'use client';

import { useEffect, useState } from 'react';

type Opt = { id: string; idx: number; label: string };
type Q = { id: string; idx: number; text: string; kind: string; required: boolean; mc_options: Opt[] };

export default function TestRunner({ slug, orgSlug }: { slug: string; orgSlug: string }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [submissionId, setSubmissionId] = useState<string>('');
  const [step, setStep] = useState(0); // 0 = pre-start; 1..N = questions; N+1 = finish

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/tests/${slug}`).then(r => r.json());
      setQuestions(r.questions || []);
      setLoading(false);
    })();
  }, [slug]);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      org_slug: orgSlug,
      first_name: String(f.get('first')||'').trim(),
      last_name:  String(f.get('last')||'').trim(),
      email:      String(f.get('email')||'').trim(),
      phone:      String(f.get('phone')||'').trim() || undefined,
    };
    const r = await fetch(`/api/tests/${slug}/submissions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Failed to start');
    setSubmissionId(j.submission_id);
    setStep(1);
  }

  async function choose(optionIdx: number) {
    const q = questions[step-1];
    await fetch(`/api/submissions/${submissionId}/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_idx: q.idx, option_idx: optionIdx })
    });
    if (step < questions.length) setStep(step+1);
    else setStep(questions.length+1);
  }

  async function finish() {
    await fetch(`/api/submissions/${submissionId}/finish`, { method: 'POST' });
    window.location.href = `/report/${submissionId}`;
  }

  if (loading) return <div>Loading…</div>;

  if (!submissionId) {
    return (
      <form onSubmit={start} className="space-y-3 max-w-xl">
        <h2 className="text-xl font-semibold">Start your test</h2>
        <div className="grid grid-cols-2 gap-2">
          <input name="first" placeholder="First name" className="border p-2 rounded" required/>
          <input name="last"  placeholder="Last name"  className="border p-2 rounded" required/>
          <input name="email" placeholder="Email"      className="border p-2 rounded col-span-2" required/>
          <input name="phone" placeholder="Phone (optional)" className="border p-2 rounded col-span-2"/>
        </div>
        <button className="px-4 py-2 bg-black text-white rounded">Start</button>
      </form>
    );
  }

  if (step <= questions.length) {
    const q = questions[step-1];
    return (
      <div className="max-w-2xl space-y-4">
        <div className="text-sm text-gray-500">Question {step} of {questions.length}</div>
        <h3 className="text-lg font-semibold">{q.text}</h3>
        <div className="space-y-2">
          {q.mc_options.map(o => (
            <button key={o.idx}
              onClick={() => choose(o.idx)}
              className="block w-full text-left border p-3 rounded hover:bg-gray-50">
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold">Ready to view your results?</h3>
      <button onClick={finish} className="px-4 py-2 bg-black text-white rounded">Finish & View Report</button>
    </div>
  );
}
