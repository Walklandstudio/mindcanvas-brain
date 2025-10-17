'use client';

import { useState } from 'react';

type Opt = { label: string; frequency: string; profile: string; points: number };
type Q = { stem: string; options: Opt[] };

const BASE_QUESTIONS: Q[] = [
  { stem: 'How do you prefer to tackle new tasks?', options: [
    { label: 'I dive right in', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'I make a detailed plan', frequency: 'D', profile: 'Architect', points: 1 },
    { label: 'I brainstorm with others', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'I follow a structured process', frequency: 'C', profile: 'Anchor', points: 1 },
  ]},
  { stem: 'Which statement describes you best in a team setting?', options: [
    { label: 'I take charge and lead', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'I keep tasks on track', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'I build a positive environment', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'I focus on details', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When faced with a problem, how do you best like to solve it?', options: [
    { label: 'Try ideas quickly', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Break into clear steps', frequency: 'D', profile: 'Architect', points: 1 },
    { label: 'Workshop with others', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Stick to proven methods', frequency: 'C', profile: 'Anchor', points: 1 },
  ]},
  { stem: 'What motivates you most at work?', options: [
    { label: 'Creating something new', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Helping people connect', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Keeping things reliable', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Improving precision & quality', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Your ideal planning style is…', options: [
    { label: 'High-level vision, flexible path', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Collaborative and iterative', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Milestones and checklists', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Detailed spec before execution', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When priorities shift, you…', options: [
    { label: 'Pivot fast and try new angles', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Align the team quickly', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Stabilize the plan & risks', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Re-evaluate system impact', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'How do you prefer to learn?', options: [
    { label: 'Experiment and iterate', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Discuss and co-create', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Read docs and SOPs', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Study models and principles', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'What do teammates rely on you for?', options: [
    { label: 'Inspiration and direction', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Energy and connection', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Consistency and dependability', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Clarity and accuracy', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When deadlines loom, you…', options: [
    { label: 'Focus on the big win', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Rally the team', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Tighten the execution plan', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Reduce ambiguity', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'What kind of feedback helps you most?', options: [
    { label: 'Vision & opportunity framing', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'People impact & messaging', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Process & risk control', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Technical depth & logic', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Your natural communication style is…', options: [
    { label: 'Big-picture & aspirational', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Relational & story-driven', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Structured & concise', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Analytical & precise', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'How do you measure success?', options: [
    { label: 'Breakthrough outcomes', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Team engagement', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Reliability & predictability', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Quality & correctness', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When conflicts arise, you…', options: [
    { label: 'Reframe around vision', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Facilitate shared understanding', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Clarify roles/process', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Ground in facts/data', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Pick the work you enjoy most:', options: [
    { label: '0→1 exploration', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Community & comms', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Program/ops excellence', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Systems & design', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Which description fits your “best day” flow?', options: [
    { label: 'Fast, inspiring, new ideas', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Collaborative, high-energy', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Calm, planned, predictable', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Deep, focused, rigorous', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
];

export default function DemoClient() {
  const [questions, setQuestions] = useState(() =>
    BASE_QUESTIONS.map((q) => ({
      stem: q.stem,
      stemRe: '',
      options: q.options.map((o) => ({ ...o, labelRe: '' })),
    }))
  );

  function rephraseQuestion(i: number) {
    const current = questions[i].stemRe || questions[i].stem;
    const next = prompt('Rephrase this question to match the client’s brand:', current);
    if (next == null) return;
    setQuestions((qs) => {
      const copy = [...qs];
      copy[i] = { ...copy[i], stemRe: next };
      return copy;
    });
  }

  function rephraseOption(qi: number, oi: number) {
    const opt = questions[qi].options[oi];
    const current = opt.labelRe || opt.label;
    const next = prompt('Rephrase this answer to match the client’s brand:', current);
    if (next == null) return;
    setQuestions((qs) => {
      const copy = [...qs];
      const q = { ...copy[qi] };
      const opts = [...q.options];
      opts[oi] = { ...opt, labelRe: next };
      q.options = opts;
      copy[qi] = q;
      return copy;
    });
  }

  function createTest(mode: 'free' | 'full') {
    const base = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://mindcanvas-staging.vercel.app';
    const fakeToken = Math.random().toString(36).slice(2, 8);
    const url = `${base}/t/${fakeToken}`;
    const iframe = `<iframe src="${url}/embed" width="100%" height="800" frameborder="0" allowfullscreen></iframe>`;
    alert(`Created ${mode === 'full' ? 'Full' : 'Free'} Test

Public URL:
${url}

Embed (iframe):
${iframe}
`);
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Test Builder</h1>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => createTest('free')}
            className="px-4 py-2 rounded-2xl bg-white text-black border"
          >
            Create Free Test
          </button>
          <button
            onClick={() => createTest('full')}
            className="px-4 py-2 rounded-2xl bg-white text-black border"
          >
            Create Full Test
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Rephrase each question/answer to match the client’s brand. (Demo mode — no login, no database.)
      </p>

      <section className="space-y-6">
        {questions.map((q, i) => (
          <div key={i} className="rounded-2xl border p-4 space-y-3 bg-white/5">
            <div className="flex items-start gap-2">
              <div className="font-semibold flex-1">
                {i + 1}. {q.stemRe || q.stem}
              </div>
              <button
                onClick={() => rephraseQuestion(i)}
                className="text-xs px-3 py-1 rounded-2xl border"
              >
                Rephrase Question
              </button>
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {q.options.map((o, oi) => (
                <div key={oi} className="rounded-xl border p-3">
                  <div className="text-sm text-gray-500">
                    {o.frequency} • {o.profile} • {o.points} pts
                  </div>
                  <div className="mt-1">{o.labelRe || o.label}</div>
                  <div className="mt-2">
                    <button
                      onClick={() => rephraseOption(i, oi)}
                      className="text-xs px-3 py-1 rounded-2xl border"
                    >
                      Rephrase Answer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
