'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Q = {
  id: string;
  idx: number;
  order: number | null;
  type: 'radio';
  text: string;
  options: string[];
  profile_map?: { profile: string; points: number }[];
};

export default function TestPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({}); // qid -> option index
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('');
      try {
        // Start (creates taker, bumps use_count)
        await fetch(`/api/public/test/${token}/start`, { cache: 'no-store' });

        // Load questions
        const r = await fetch(`/api/public/test/${token}/questions`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
        setQuestions(j.questions || []);
      } catch (e: any) {
        setErr(e?.message || 'failed_to_load');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const canSubmit = useMemo(() => {
    if (questions.length === 0) return false;
    return questions.every(q => typeof answers[q.id] === 'number');
  }, [questions, answers]);

  const submit = async () => {
    try {
      // Compute simple per-profile totals using the weight map
      const totals: Record<string, number> = {};
      for (const q of questions) {
        const idx = answers[q.id];
        if (idx == null) continue;
        const pm = (q.profile_map || [])[idx];
        if (pm && pm.profile && typeof pm.points === 'number') {
          totals[pm.profile] = (totals[pm.profile] || 0) + pm.points;
        }
      }
      const r = await fetch(`/api/public/test/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'totals', totals }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      router.push(`/t/${token}/result`);
    } catch (e: any) {
      alert(`Submit failed: ${e?.message || 'unknown'}`);
    }
  };

  if (loading) return <main className="mc-bg min-h-screen text-white p-6">Loading…</main>;
  if (err) return <main className="mc-bg min-h-screen text-white p-6">Couldn’t load test: {err}</main>;
  if (questions.length === 0) return <main className="mc-bg min-h-screen text-white p-6">No questions.</main>;

  return (
    <main className="mc-bg min-h-screen text-white p-6 space-y-6">
      <h1 className="text-2xl font-bold">Test</h1>

      {questions.map((q) => (
        <div key={q.id} className="rounded-xl border border-white/10 p-4 bg-white/5">
          <div className="font-semibold">{q.idx}. {q.text}</div>
          <div className="mt-2 space-y-2">
            {q.options.map((opt, i) => (
              <label key={i} className="block">
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === i}
                  onChange={() => setAnswers(a => ({ ...a, [q.id]: i }))}
                />{' '}
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        className="px-4 py-2 rounded-lg bg-sky-700 disabled:opacity-60"
        onClick={submit}
        disabled={!canSubmit}
      >
        Submit
      </button>
    </main>
  );
}
