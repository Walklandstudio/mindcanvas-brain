'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Question = {
  id: string;
  idx: number;
  text: string;
  options: string[];
  category?: string | null;
};

type StartPayload = {
  ok: true;
  startPath: string;
  test: { id: string; name: string | null; slug: string | null };
  link: { id: string; token: string; expires_at: string | null };
  taker: { id: string; email: string | null; status: 'started' };
};

type QuestionsPayload = { ok: true; questions: Question[] };

type SubmitBody = {
  taker_id: string;
  answers: { question_id: string; value: number }[]; // value is 1..N
};

export default function PublicTestClient({ token }: { token: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  // If you already pass email/name via URL or parent, you can read them here.
  const presetEmail = sp.get('email') || '';

  // Local state
  const [takerId, setTakerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({}); // qid -> 1..N

  // ---- 1) Start the test (gets taker_id) ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');

        // POST /api/test/[token]/start
        const startRes = await fetch(`/api/test/${encodeURIComponent(token)}/start`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: presetEmail || null,
            // add first_name/last_name/company/role_title here if you collect them
            // first_name, last_name, company, role_title
            meta: null,
          }),
        });

        const ct = startRes.headers.get('content-type') || '';
        const startJson: any = ct.includes('application/json') ? await startRes.json() : null;
        if (!startRes.ok || !startJson?.ok) {
          throw new Error(startJson?.error || `Start failed (${startRes.status})`);
        }

        const startPayload = startJson as StartPayload;
        if (!startPayload.taker?.id) throw new Error('No taker id returned from start');

        // Save TID
        if (alive) setTakerId(startPayload.taker.id);

        // ---- 2) Fetch questions ----
        const qRes = await fetch(`/api/public/test/${encodeURIComponent(token)}/questions`, {
          cache: 'no-store',
        });
        const qCT = qRes.headers.get('content-type') || '';
        const qJson: any = qCT.includes('application/json') ? await qRes.json() : null;
        if (!qRes.ok || !qJson?.ok) {
          throw new Error(qJson?.error || `Questions failed (${qRes.status})`);
        }

        const qp = qJson as QuestionsPayload;
        if (alive) setQuestions(qp.questions || []);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, presetEmail]);

  const ordered = useMemo(
    () => [...questions].sort((a, b) => Number(a.idx ?? 0) - Number(b.idx ?? 0)),
    [questions]
  );

  function setAnswer(qid: string, optionIndex0: number) {
    // store as 1..N for the submit API
    setAnswers((prev) => ({ ...prev, [qid]: optionIndex0 + 1 }));
  }

  async function onSubmit() {
    try {
      if (!takerId) throw new Error('Missing taker id');

      // Build payload answers in the shape the API expects
      const payload: SubmitBody = {
        taker_id: takerId,
        answers: ordered
          .map((q) => ({
            question_id: q.id,
            value: answers[q.id] ?? 0, // 1..N (0 means skipped)
          }))
          .filter((a) => a.value > 0),
      };

      const res = await fetch(`/api/public/test/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get('content-type') || '';
      const j: any = ct.includes('application/json') ? await res.json() : null;
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || `Submit failed (${res.status})`);
      }

      // Go to result (include tid so Result page & Report work)
      router.push(`/t/${encodeURIComponent(token)}/result?tid=${encodeURIComponent(takerId)}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Preparing your test…</h1>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Couldn’t start the test</h1>
        <p className="text-red-600 mt-2">{err}</p>
        <div className="text-xs text-gray-500 mt-3">
          Debug:
          <div className="mt-1">/api/test/{token}/start</div>
          <div className="mt-1">/api/public/test/{token}/questions</div>
        </div>
      </div>
    );
  }

  if (!ordered.length) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">No questions available</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Profile Test</h1>
        <p className="text-sm text-gray-500 mt-1">Answer the questions below.</p>
      </header>

      <ol className="space-y-6">
        {ordered.map((q, i) => {
          const selected1 = answers[q.id] ?? 0; // 1..N
          return (
            <li key={q.id} className="rounded-xl border p-4">
              <div className="font-medium mb-3">
                {i + 1}. {q.text}
              </div>
              <div className="grid gap-2">
                {q.options.map((opt, idx0) => {
                  const checked = selected1 === idx0 + 1;
                  return (
                    <label
                      key={idx0}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${
                        checked ? 'border-sky-500 bg-sky-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => setAnswer(q.id, idx0)}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="pt-4">
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex items-center rounded-xl bg-sky-600 px-5 py-3 text-white hover:bg-sky-700"
        >
          Submit answers
        </button>
      </div>
    </div>
  );
}
