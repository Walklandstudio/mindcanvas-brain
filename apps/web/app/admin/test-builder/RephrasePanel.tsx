'use client';

import { useState } from 'react';
import { rephraseQuestionAction, rephraseOptionAction } from './_actions';

export function RephraseQuestion(props: { q: { id: string; stem: string; stem_rephrased?: string } }) {
  const { q } = props;
  const [text, setText] = useState(q.stem_rephrased ?? q.stem);
  const [brandVoice, setBrandVoice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAI() {
    setBusy(true);
    try {
      const res = await rephraseQuestionAction({
        questionId: q.id,
        currentText: text,
        brandVoice,
      });
      setText(res.text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4 space-y-2">
      <label className="text-sm text-gray-500">Brand voice (optional)</label>
      <input
        className="w-full rounded border px-3 py-2"
        value={brandVoice}
        onChange={(e) => setBrandVoice(e.target.value)}
        placeholder="e.g., friendly, practical, no jargon"
      />
      <textarea
        className="w-full rounded border px-3 py-2 min-h-24"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={handleAI}
          disabled={busy}
          className="px-3 py-2 rounded bg-black text-white"
        >
          {busy ? 'Rephrasing…' : 'AI Rephrase & Save'}
        </button>
      </div>
    </div>
  );
}

export function RephraseOption(props: { o: { id: string; label: string; label_rephrased?: string } }) {
  const { o } = props;
  const [text, setText] = useState(o.label_rephrased ?? o.label);
  const [brandVoice, setBrandVoice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAI() {
    setBusy(true);
    try {
      const res = await rephraseOptionAction({
        optionId: o.id,
        currentText: text,
        brandVoice,
      });
      setText(res.text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-3 space-y-2">
      <input
        className="w-full rounded border px-3 py-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={handleAI}
        disabled={busy}
        className="px-3 py-2 rounded bg-black text-white"
      >
        {busy ? 'Rephrasing…' : 'AI Rephrase & Save'}
      </button>
    </div>
  );
}
