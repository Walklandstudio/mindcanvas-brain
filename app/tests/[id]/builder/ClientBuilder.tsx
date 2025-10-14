'use client';

import { useMemo, useState } from 'react';

type Choice = { id: string; label: string; points?: number };
type Question = { id: string; text: string; choices: Choice[]; weight?: number };

const sampleQuestions = (): Question[] => [
  {
    id: 'q1',
    text: 'I prefer initiating new ideas over refining existing processes.',
    weight: 1,
    choices: [
      { id: 'a', label: 'Strongly disagree', points: 0 },
      { id: 'b', label: 'Disagree', points: 1 },
      { id: 'c', label: 'Neutral', points: 2 },
      { id: 'd', label: 'Agree', points: 3 },
      { id: 'e', label: 'Strongly agree', points: 4 },
    ],
  },
  {
    id: 'q2',
    text: 'I enjoy simplifying complex topics for broader audiences.',
    weight: 1,
    choices: [
      { id: 'a', label: 'Strongly disagree', points: 0 },
      { id: 'b', label: 'Disagree', points: 1 },
      { id: 'c', label: 'Neutral', points: 2 },
      { id: 'd', label: 'Agree', points: 3 },
      { id: 'e', label: 'Strongly agree', points: 4 },
    ],
  },
];

export default function ClientBuilder({ testId }: { testId: string }) {
  const [tab, setTab] = useState<'questions' | 'scoring' | 'preview'>('questions');
  const [title, setTitle] = useState('Signature Full');
  const [questions, setQuestions] = useState<Question[]>(sampleQuestions());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const totalWeight = useMemo(
    () => questions.reduce((acc, q) => acc + (q.weight ?? 1), 0),
    [questions]
  );

  function updateQuestion(i: number, patch: Partial<Question>) {
    setQuestions(prev => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function updateChoice(qi: number, ci: number, patch: Partial<Choice>) {
    setQuestions(prev =>
      prev.map((q, idx) =>
        idx === qi
          ? { ...q, choices: q.choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }
          : q
      )
    );
  }

  function addQuestion() {
    setQuestions(prev => [
      ...prev,
      { id: `q${prev.length + 1}`, text: '', weight: 1, choices: [] },
    ]);
  }

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/tests/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testId, title, questions }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Save failed');
      setMsg('Saved ✓');
    } catch (e: any) {
      setMsg(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm text-white/70 mb-1">Test title</label>
          <input
            className="w-full rounded-xl bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {msg && <span className="text-sm text-white/70 self-center">{msg}</span>}
        </div>
      </div>

      <div className="flex gap-2">
        {(['questions', 'scoring', 'preview'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1 text-sm ${
              tab === t ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'questions' && (
        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-2xl border border-white/10 p-4 bg-white/5">
              <div className="mb-3 flex items-center gap-3">
                <input
                  className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
                  placeholder={`Question ${qi + 1}`}
                  value={q.text}
                  onChange={e => updateQuestion(qi, { text: e.target.value })}
                />
                <input
                  type="number"
                  className="w-24 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
                  value={q.weight ?? 1}
                  onChange={e => updateQuestion(qi, { weight: Number(e.target.value || 1) })}
                  title="Weight"
                />
              </div>

              <div className="space-y-2">
                {q.choices.map((c, ci) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
                      placeholder={`Choice ${ci + 1}`}
                      value={c.label}
                      onChange={e => updateChoice(qi, ci, { label: e.target.value })}
                    />
                    <input
                      type="number"
                      className="w-24 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
                      value={c.points ?? 0}
                      onChange={e => updateChoice(qi, ci, { points: Number(e.target.value || 0) })}
                      title="Points"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  onClick={() =>
                    updateQuestion(qi, {
                      choices: [...q.choices, { id: `c${q.choices.length + 1}`, label: '', points: 0 }],
                    })
                  }
                  className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
                >
                  Add choice
                </button>
              </div>
            </div>
          ))}

          <button onClick={addQuestion} className="rounded-xl bg-brand-500/80 px-4 py-2 text-sm hover:bg-brand-500">
            Add question
          </button>
        </div>
      )}

      {tab === 'scoring' && (
        <div className="rounded-2xl border border-white/10 p-6 bg-white/5">
          <p className="text-sm text-white/70">
            Total weight: <span className="font-semibold text-white">{totalWeight}</span>
          </p>
          <p className="mt-2 text-sm text-white/70">
            Scoring rules & frequency/profile mapping will go here. (Skeleton)
          </p>
        </div>
      )}

      {tab === 'preview' && (
        <div className="rounded-2xl border border-white/10 p-6 bg-white/5">
          <p className="mb-4 text-sm text-white/70">
            Live preview (stub): shows how the test would render to participants.
          </p>
          <ol className="space-y-4 list-decimal pl-6">
            {questions.map((q, i) => (
              <li key={q.id}>
                <div className="font-medium">{q.text || `(Untitled question ${i + 1})`}</div>
                <ul className="mt-1 space-y-1">
                  {q.choices.map(c => (
                    <li key={c.id} className="text-white/80">• {c.label || '(Empty choice)'}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
