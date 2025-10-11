'use client';

import { useState, useEffect, useCallback } from 'react';
import useOnboardingAutosave from '../_lib/useOnboardingAutosave';

type Goals = {
  industry?: string;
  sector?: string;
  primaryGoal?: string;
  missionAlign?: string;
  outcomes?: string;
  audience?: string;
  challenges?: string;
  extraInsights?: string;
  industryInfo?: string;
  programType?: 'standalone' | 'part-of-program' | '';
  integration?: 'link' | 'embed' | 'api' | '';
  pricing?: 'free' | 'paid' | 'tiered' | '';
  price?: number | '';
};

async function load(): Promise<Goals> {
  const res = await fetch('/api/onboarding/get?step=goals', { credentials: 'include' });
  if (!res.ok) return {};
  const json = await res.json();
  return (json?.data as Goals) ?? {};
}

async function saveGoals(data: Goals) {
  await fetch('/api/onboarding/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ step: 'goals', data }),
  });
}

export default function GoalsPage() {
  const [data, setData] = useState<Goals>({});

  useEffect(() => {
    (async () => setData(await load()))();
  }, []);

  const saveCb = useCallback((d: Goals) => saveGoals(d), []);
  useOnboardingAutosave<Goals>(data, saveCb, 600);

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-6">Step 3 — Profile Test Goals</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <label className="flex flex-col gap-2">
          <span>Industry</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.industry ?? ''}
            onChange={(e) => setData((s) => ({ ...s, industry: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Sector</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.sector ?? ''}
            onChange={(e) => setData((s) => ({ ...s, sector: e.target.value }))}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <label className="flex flex-col gap-2">
          <span>What is the primary goal of the profile test?</span>
          <textarea
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
            value={data.primaryGoal ?? ''}
            onChange={(e) => setData((s) => ({ ...s, primaryGoal: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>How does this test align with your company’s mission or vision?</span>
          <textarea
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
            value={data.missionAlign ?? ''}
            onChange={(e) => setData((s) => ({ ...s, missionAlign: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>What specific outcomes would you like participants to achieve?</span>
          <textarea
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
            value={data.outcomes ?? ''}
            onChange={(e) => setData((s) => ({ ...s, outcomes: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Who will primarily take this test?</span>
          <input
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
            value={data.audience ?? ''}
            onChange={(e) => setData((s) => ({ ...s, audience: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Audience challenges this test could help address</span>
          <textarea
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
            value={data.challenges ?? ''}
            onChange={(e) => setData((s) => ({ ...s, challenges: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Other insights to collect</span>
          <textarea
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
            value={data.extraInsights ?? ''}
            onChange={(e) => setData((s) => ({ ...s, extraInsights: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Industry-relevant info (revenue, targets, etc.)</span>
          <textarea
            className="rounded-md border border-white/20 bg-white text-black px-3 py-2 min-h-24"
            value={data.industryInfo ?? ''}
            onChange={(e) => setData((s) => ({ ...s, industryInfo: e.target.value }))}
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2">
            <span>Program Type</span>
            <select
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
              value={data.programType ?? ''}
              onChange={(e) =>
                setData((s) => ({ ...s, programType: e.target.value as Goals['programType'] }))
              }
            >
              <option value="">Select…</option>
              <option value="standalone">Standalone</option>
              <option value="part-of-program">Part of a larger program</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span>Integration</span>
            <select
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
              value={data.integration ?? ''}
              onChange={(e) =>
                setData((s) => ({ ...s, integration: e.target.value as Goals['integration'] }))
              }
            >
              <option value="">Select…</option>
              <option value="link">Link</option>
              <option value="embed">Embed</option>
              <option value="api">API</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span>Pricing</span>
            <select
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
              value={data.pricing ?? ''}
              onChange={(e) =>
                setData((s) => ({ ...s, pricing: e.target.value as Goals['pricing'] }))
              }
            >
              <option value="">Select…</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="tiered">Tiered</option>
            </select>
          </label>
        </div>

        {data.pricing === 'paid' && (
          <label className="flex flex-col gap-2">
            <span>Price Point (if paid)</span>
            <input
              type="number"
              className="rounded-md border border-white/20 bg-white text-black px-3 py-2"
              value={data.price ?? ''}
              onChange={(e) =>
                setData((s) => ({ ...s, price: e.target.value === '' ? '' : Number(e.target.value) }))
              }
            />
          </label>
        )}
      </div>
    </main>
  );
}
