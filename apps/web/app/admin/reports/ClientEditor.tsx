'use client';

import { useState } from 'react';

type Section = {
  title: string;
  body: string;
};

export default function ClientEditor() {
  const [profileName, setProfileName] = useState('Visionary');
  const [sections, setSections] = useState<Section[]>([
    { title: 'Strengths', body: '' },
    { title: 'Challenges', body: '' },
    { title: 'Ideal Roles', body: '' },
    { title: 'Guidance', body: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [drafting, setDrafting] = useState(false);

  // Optional: allow passing brand/goals context from onboarding later
  const brand = { description: '', voice: '', font: '', colors: {} as any };
  const goals = {} as any;

  function update(i: number, patch: Partial<Section>) {
    setSections(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/reports/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileName, sections }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Save failed');
      setMessage('Draft saved ✓');
    } catch (e: any) {
      setMessage(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function aiDraftAll() {
    setDrafting(true);
    setMessage('Drafting…');
    try {
      const next = [...sections];
      for (let i = 0; i < next.length; i++) {
        const s = next[i];
        const res = await fetch('/api/ai/rephrase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileName,
            sectionTitle: s.title,
            draft: s.body,
            brand,
            goals,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || 'AI error');
        next[i] = { ...s, body: j.text ?? s.body };
      }
      setSections(next);
      setMessage('AI draft complete ✓');
    } catch (e: any) {
      setMessage(e?.message || 'AI draft failed');
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="block text-sm text-white/70 mb-1">Profile</label>
          <input
            className="w-full rounded-xl bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            placeholder="e.g., Visionary"
          />
        </div>
        <div className="md:col-span-2 flex items-end gap-3">
          <button
            onClick={aiDraftAll}
            disabled={drafting}
            className="rounded-xl bg-brand-500/80 px-4 py-2 text-sm text-white hover:bg-brand-500 transition disabled:opacity-60"
          >
            {drafting ? 'Drafting…' : 'Use AI → Draft sections'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {message && <span className="text-sm text-white/70">{message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sections.map((s, i) => (
          <div key={i} className="rounded-2xl border border-white/10 p-4 bg-white/5">
            <input
              className="mb-2 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={s.title}
              onChange={e => update(i, { title: e.target.value })}
            />
            <textarea
              rows={8}
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={s.body}
              onChange={e => update(i, { body: e.target.value })}
              placeholder={`Write ${s.title.toLowerCase()} content…`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
