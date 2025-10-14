'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Q = { id: string; text: string; type: string; order: number };

export default function StartTest(props: any) {
  const token = (props?.params?.token as string) || '';
  const sp = useSearchParams();
  const router = useRouter();
  const takerId = sp.get('tid') || '';

  const [loading, setLoading] = useState(true);
  const [qs, setQs] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await fetch(`/api/public/test/${token}/questions`);
      const j = await res.json();
      if (j?.ok) setQs(j.data);
      setLoading(false);
    })();
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const payload = {
      taker_id: takerId,
      answers: Object.entries(answers).map(([question_id, value]) => ({ question_id, value }))
    };
    const res = await fetch(`/api/public/test/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (j?.ok) {
      router.replace(`/t/${token}/done`);
    } else {
      setMsg('❌ ' + (j?.error || 'submit failed'));
    }
  }

  if (!takerId) {
    return (
      <main className="p-8">
        Missing participant id. Please start from the invitation page.
      </main>
    );
  }
  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Test</h1>
      {qs.length === 0 ? (
        <p>No questions yet. Please contact the organizer.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {qs.map((q, i) => (
            <div key={q.id} className="rounded-lg border bg-white p-4">
              <div className="text-sm text-gray-500">Question {i + 1}</div>
              <div className="font-medium">{q.text}</div>
              <textarea
                className="mt-2 w-full rounded-md border px-3 py-2"
                rows={3}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Your answer..."
                required
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button className="rounded-md bg-black px-4 py-2 text-white">Submit</button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </form>
      )}
    </main>
  );
}
