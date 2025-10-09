'use client';

import { useEffect, useMemo, useState } from 'react';

type Question = {
  id?: string;
  label: string;
  options: string[];
  display_order: number;
};

type Answer = { order: number; choice: 1|2|3|4 };

export default function TakeTestPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, 1|2|3|4>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ frequency: 'A'|'B'|'C'|'D'; profile: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Minimal: we can fetch questions from your org_questions listing endpoint or embed here.
        const res = await fetch('/api/questions/list', { method: 'GET' });
        if (!res.ok) throw new Error('failed_questions');
        const json = await res.json();
        if (mounted) {
          const qs = (json?.items ?? []) as Question[];
          qs.sort((a,b) => a.display_order - b.display_order);
          setQuestions(qs.slice(0, 15));
          setLoading(false);
        }
      } catch (e:any) {
        if (mounted) {
          setError('Could not load questions.');
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every(q => answers[q.display_order]),
    [questions, answers]
  );

  const onPick = (order: number, choice: 1|2|3|4) => {
    setAnswers(prev => ({ ...prev, [order]: choice }));
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        taker: {}, // could capture name/email here
        answers: Object.entries(answers).map(([order, choice]) => ({
          order: Number(order),
          choice: Number(choice),
        })),
      };

      // 1) preview (client-friendly) using /api/test/score
      const previewRes = await fetch('/api/test/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload.answers }),
      });
      if (previewRes.ok) {
        const pj = await previewRes.json();
        setPreview({ frequency: pj?.result?.frequency, profile: pj?.result?.profile });
      }

      // 2) persist
      const auth = localStorage.getItem('sb-access-token'); // If you store it differently, swap this.
      const submitRes = await fetch('/api/test/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth ? { 'Authorization': `Bearer ${auth}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const sj = await submitRes.json();
      if (!submitRes.ok || !sj?.ok) {
        throw new Error(sj?.error || 'submit_failed');
      }

      setToken(sj.token);

      // Navigate to results
      window.location.href = `/t/${sj.token}/result`;
    } catch (e:any) {
      setError(e?.message ?? 'submit_failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="mx-auto max-w-3xl p-6">Loading…</main>;
  if (error) return <main className="mx-auto max-w-3xl p-6 text-red-600">{error}</main>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Signature Profiling Test</h1>
        <p className="text-sm text-gray-600">Answer all questions to see your result.</p>
      </header>

      <ol className="space-y-6">
        {questions.map((q) => (
          <li key={q.display_order} className="border rounded-lg p-4">
            <div className="font-medium mb-3">{q.label}</div>
            <div className="grid gap-2">
              {q.options.map((opt, idx) => {
                const choice = (idx + 1) as 1|2|3|4;
                const selected = answers[q.display_order] === choice;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onPick(q.display_order, choice)}
                    className={`text-left border rounded-md px-3 py-2 hover:bg-gray-50 ${selected ? 'border-sky-500 ring-1 ring-sky-500' : 'border-gray-200'}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3">
        <button
          disabled={!allAnswered || submitting}
          onClick={submit}
          className={`px-4 py-2 rounded-md text-white ${allAnswered ? 'bg-sky-700 hover:bg-sky-800' : 'bg-gray-400'} `}
        >
          {submitting ? 'Submitting…' : 'Submit & View Result'}
        </button>
        {preview && (
          <div className="text-sm text-gray-600">
            Preview:&nbsp;
            <strong>Frequency {preview.frequency}</strong>,&nbsp;
            <strong>Profile {preview.profile}</strong>
          </div>
        )}
      </div>

      {token && (
        <p className="text-sm">
          Saved! Shareable link:&nbsp;
          <a className="text-sky-700 underline" href={`/t/${token}/result`}>{window.location.origin}/t/{token}/result</a>
        </p>
      )}
    </main>
  );
}
