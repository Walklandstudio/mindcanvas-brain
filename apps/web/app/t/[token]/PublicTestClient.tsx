'use client';

import { useEffect, useState } from 'react';

type Question = {
  id: string;
  idx?: number | null;
  order?: number | null;
  type?: string | null;
  text: string;
  options?: any;
};

export default function PublicTestClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);

  async function fetchJson(url: string, init?: RequestInit) {
    const r = await fetch(url, init);
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = (await r.text()).slice(0, 400);
      throw new Error(`HTTP ${r.status} – non-JSON response:\n${text}`);
    }
    const j = await r.json();
    if (!r.ok || j?.ok === false) {
      throw new Error(j?.error || `HTTP ${r.status}`);
    }
    return j;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');

        // 1) Start the session (creates taker, increments link)
        await fetchJson(`/api/public/test/${token}/start`, { method: 'POST' });
        if (!alive) return;
        setStarted(true);

        // 2) Load questions
        const q = await fetchJson(`/api/public/test/${token}/questions`);
        if (!alive) return;
        setQuestions(Array.isArray(q?.questions) ? q.questions : []);
      } catch (e: any) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

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

  return (
    <div className="min-h-screen mc-bg text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">Public Test</h1>
      <div className="text-white/70">
        Token: <code className="text-white">{token}</code> • {started ? 'started' : 'not started'}
      </div>

      {questions.length === 0 ? (
        <div className="text-white/70">No questions configured for this test.</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-sm text-white/60 mb-1">Question {i + 1}</div>
              <div className="font-medium">{q.text}</div>
              {/* TODO: render options/inputs. This is a smoke test UI to prove the flow. */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
