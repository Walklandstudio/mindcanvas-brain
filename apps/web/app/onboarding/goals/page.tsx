// apps/web/app/onboarding/goals/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOnboardingAutosave } from '../_lib/useOnboardingAutosave';

type Goals = {
  industry?: string;
  sector?: string;
  primaryGoal?: string;
  missionAlignment?: string;
  desiredOutcomes?: string;
  targetAudience?: string;
  audienceChallenges?: string;
  extraInsights?: string;
  industryInfo?: string;
  programPlacement?: string;
  integration?: 'Standalone' | 'Zapier' | 'Webhook' | 'API' | '';
  monetization?: 'Free' | 'Paid' | 'Tiered' | '';
  price?: number | '';
};

const empty: Goals = {
  industry: '',
  sector: '',
  primaryGoal: '',
  missionAlignment: '',
  desiredOutcomes: '',
  targetAudience: '',
  audienceChallenges: '',
  extraInsights: '',
  industryInfo: '',
  programPlacement: '',
  integration: '',
  monetization: '',
  price: '',
};

export default function Page() {
  const [data, setData] = useState<Goals>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useOnboardingAutosave('goals', data);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/onboarding', { cache: 'no-store' });
        const j = await res.json();
        setData({ ...empty, ...(j?.onboarding?.goals ?? {}) });
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: data }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Save failed');
      }
      setMsg('Saved ✓');
    } catch (e: any) {
      setMsg(e?.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2000);
    }
  }

  const canContinue = useMemo(
    () => !!data?.industry && !!data?.primaryGoal,
    [data?.industry, data?.primaryGoal]
  );

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <div className="text-sm opacity-70">Loading…</div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Step 3 — Profile Test Goals</h1>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Industry</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.industry ?? ''}
              onChange={(e) => setData((d) => ({ ...d, industry: e.target.value }))}
              placeholder="e.g., SaaS, Education, Finance"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Sector</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.sector ?? ''}
              onChange={(e) => setData((d) => ({ ...d, sector: e.target.value }))}
              placeholder="e.g., B2B, B2C, Enterprise"
            />
          </div>
        </div>

        <FieldTA
          label="What is the primary goal of the profile test?"
          value={data.primaryGoal ?? ''}
          onChange={(v) => setData((d) => ({ ...d, primaryGoal: v }))}
        />
        <FieldTA
          label="How does this test align with your company’s mission or vision?"
          value={data.missionAlignment ?? ''}
          onChange={(v) => setData((d) => ({ ...d, missionAlignment: v }))}
        />
        <FieldTA
          label="What specific outcomes would you like participants to achieve?"
          value={data.desiredOutcomes ?? ''}
          onChange={(v) => setData((d) => ({ ...d, desiredOutcomes: v }))}
        />
        <FieldTA
          label="Who will primarily take this test?"
          value={data.targetAudience ?? ''}
          onChange={(v) => setData((d) => ({ ...d, targetAudience: v }))}
        />
        <FieldTA
          label="Are there any challenges your audience faces that the test could help address?"
          value={data.audienceChallenges ?? ''}
          onChange={(v) => setData((d) => ({ ...d, audienceChallenges: v }))}
        />
        <FieldTA
          label="Other insights you want to collect as part of your questions?"
          value={data.extraInsights ?? ''}
          onChange={(v) => setData((d) => ({ ...d, extraInsights: v }))}
        />
        <FieldTA
          label="Industry-relevant info (revenue, targets, etc.)"
          value={data.industryInfo ?? ''}
          onChange={(v) => setData((d) => ({ ...d, industryInfo: v }))}
        />
        <FieldTA
          label="Will the test be standalone or part of a larger program?"
          value={data.programPlacement ?? ''}
          onChange={(v) => setData((d) => ({ ...d, programPlacement: v }))}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Integration</label>
            <select
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.integration ?? ''}
              onChange={(e) =>
                setData((d) => ({ ...d, integration: e.target.value as Goals['integration'] }))
              }
            >
              <option value="">Select…</option>
              <option>Standalone</option>
              <option>Zapier</option>
              <option>Webhook</option>
              <option>API</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Monetization</label>
            <select
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.monetization ?? ''}
              onChange={(e) =>
                setData((d) => ({ ...d, monetization: e.target.value as Goals['monetization'] }))
              }
            >
              <option value="">Select…</option>
              <option>Free</option>
              <option>Paid</option>
              <option>Tiered</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Price Point (if paid)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-md border px-3 py-2 bg-white text-black"
              value={data.price ?? ''}
              onChange={(e) =>
                setData((d) => ({ ...d, price: e.target.value === '' ? '' : Number(e.target.value) }))
              }
              placeholder="e.g., 49.00"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a className="px-4 py-2 rounded-xl border" href="/onboarding/branding">
            Back
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <a
            className={`px-4 py-2 rounded-xl border ${!canContinue ? 'pointer-events-none opacity-50' : ''}`}
            href="/admin/framework"
          >
            Next
          </a>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </main>
  );
}

function FieldTA({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <textarea
        rows={4}
        className="w-full rounded-md border px-3 py-2 bg-white text-black"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

