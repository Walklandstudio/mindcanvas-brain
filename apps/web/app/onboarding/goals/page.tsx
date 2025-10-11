'use client';
import { useState, useCallback, useEffect } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

type Goals = {
  industry?: string; sector?: string;
  primaryGoal?: string; alignMission?: string; outcomes?: string;
  audience?: string; challenges?: string; otherInsights?: string;
  industryInfo?: string; partOfProgram?: string;
  integration?: 'none'|'zapier'|'api';
  pricing?: 'free'|'paid'|'tiered'; price?: number;
};

async function load(): Promise<Goals> {
  const r = await fetch('/api/onboarding', { cache:'no-store' });
  const j = await r.json();
  return (j.onboarding?.goals ?? {}) as Goals;
}

async function saveGoals(payload: Goals) {
  await fetch('/api/onboarding', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ goals: payload })
  });
}

export default function Page() {
  const [g, setG] = useState<Goals>({});

  useEffect(() => { (async () => setG(await load()))(); }, []);
  const saver = useCallback((d: Goals) => saveGoals(d), []);
  useOnboardingAutosave(g, saver, 400);

  const set = (k: keyof Goals, v: any) => setG(prev => ({ ...prev, [k]: v }));

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-6">Step 4 — Profile Test Goals</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Industry</label>
          <input
            className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={g.industry ?? ''}
            onChange={(e)=>set('industry', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Sector</label>
          <input
            className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={g.sector ?? ''}
            onChange={(e)=>set('sector', e.target.value)}
          />
        </div>
      </div>

      {([
        ['primaryGoal','What is the primary goal of the profile test?'],
        ['alignMission','How does this test align with your company’s mission or vision?'],
        ['outcomes','What specific outcomes would you like participants to achieve after completing the test?'],
        ['audience','Who will primarily take this test?'],
        ['challenges','Are there any challenges your audience faces that the test could help address?'],
        ['otherInsights','Other insights you want to collect as part of your questions?'],
        ['industryInfo','Industry-relevant info (revenue, targets, etc.)'],
        ['partOfProgram','Will the test be standalone or part of a larger program?'],
      ] as const).map(([key, label]) => (
        <div key={key} className="mt-4">
          <label className="block text-sm mb-1">{label}</label>
          <textarea
            rows={3}
            className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={(g as any)[key] ?? ''}
            onChange={(e)=>set(key as keyof Goals, e.target.value)}
          />
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-sm mb-1">Integration</label>
          <select
            className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={g.integration ?? 'none'}
            onChange={(e)=>set('integration', e.target.value as Goals['integration'])}
          >
            <option value="none">None</option>
            <option value="zapier">Zapier</option>
            <option value="api">API</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Pricing</label>
          <select
            className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={g.pricing ?? 'free'}
            onChange={(e)=>set('pricing', e.target.value as Goals['pricing'])}
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
            <option value="tiered">Tiered</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Price Point (if paid)</label>
          <input
            type="number"
            className="w-full rounded-md border px-3 py-2 bg-white text-black"
            value={Number(g.price ?? 0)}
            onChange={(e)=>set('price', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <a className="px-4 py-2 rounded-xl border" href="/onboarding/branding">Back</a>
        <a className="px-4 py-2 rounded-xl bg-white text-black" href="/admin/framework">Finish & Generate Framework</a>
      </div>
    </main>
  );
}
