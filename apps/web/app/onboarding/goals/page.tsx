'use client';

import { useEffect, useState } from 'react';

type Goals = {
  industry?: string;
  sector?: string;

  primaryGoal?: string;
  visionAlign?: string;
  outcomes?: string;
  audience?: string;
  challenges?: string;
  extraInsights?: string;
  industryInfo?: string;

  programType?: string;              // standalone / part_of_program
  integration?: string;              // how integrated with system
  pricingModel?: 'free' | 'paid' | 'tiered';
  pricePoint?: number | '' ;         // shown if paid/tiered
};

const INDUSTRIES = [
  'Technology', 'SaaS', 'Finance', 'Healthcare', 'Education', 'Media & Entertainment',
  'Retail & E-commerce', 'Manufacturing', 'Consulting & Services', 'Non-profit', 'Other'
];

const SECTORS = [
  'B2B', 'B2C', 'Public Sector', 'Enterprise', 'SMB / Mid-market', 'Startups', 'Other'
];

const INTEGRATIONS = [
  'Email only',
  'Embedded on website',
  'CRM (HubSpot / Salesforce)',
  'LMS / LXP',
  'HRIS / ATS',
  'Zapier / Webhooks',
  'Custom API',
];

export default function Page() {
  const [data, setData] = useState<Goals>({});
  const [saving, setSaving] = useState(false);

  // Load existing
  useEffect(() => {
    (async () => {
      const r = await fetch('/api/onboarding', { cache: 'no-store' });
      const j = await r.json();
      setData(j.onboarding?.goals ?? {});
    })();
  }, []);

  function update<K extends keyof Goals>(key: K, value: Goals[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  async function save(next?: () => void) {
    setSaving(true);
    try {
      const res = await fetch('/api/onboarding', {
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ goals: data })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'Save failed');
        return;
      }
      next?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Step 4 — Profile Test Goals</h1>
      <p className="text-sm text-slate-300">
        Tell us how this test will be used. We’ll tune the framework, reports, and test builder to align with your objectives.
      </p>

      {/* Industry & Sector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Industry</label>
          <select
            className="w-full rounded-md border bg-white/5 px-3 py-2"
            value={data.industry ?? ''}
            onChange={e => update('industry', e.target.value)}
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Sector</label>
          <select
            className="w-full rounded-md border bg-white/5 px-3 py-2"
            value={data.sector ?? ''}
            onChange={e => update('sector', e.target.value)}
          >
            <option value="">Select sector…</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Goals */}
      <div className="space-y-4">
        <TA
          label="What is the primary goal of the profile test?"
          value={data.primaryGoal ?? ''}
          onChange={v => update('primaryGoal', v)}
        />
        <TA
          label="How does this test align with your company’s mission or vision?"
          value={data.visionAlign ?? ''}
          onChange={v => update('visionAlign', v)}
        />
        <TA
          label="What specific outcomes would you like participants to achieve after completing the test?"
          value={data.outcomes ?? ''}
          onChange={v => update('outcomes', v)}
        />
        <TA
          label="Who will primarily take this test?"
          value={data.audience ?? ''}
          onChange={v => update('audience', v)}
        />
        <TA
          label="Are there any challenges your audience faces that the test could help address?"
          value={data.challenges ?? ''}
          onChange={v => update('challenges', v)}
        />
        <TA
          label="Other insights you want to collect as part of your questions?"
          value={data.extraInsights ?? ''}
          onChange={v => update('extraInsights', v)}
        />
        <TA
          label="Industry-relevant info (revenue, targets, etc.)"
          value={data.industryInfo ?? ''}
          onChange={v => update('industryInfo', v)}
        />
      </div>

      {/* Program / Integration / Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Will the test be standalone or part of a larger program?</label>
          <select
            className="w-full rounded-md border bg-white/5 px-3 py-2"
            value={data.programType ?? ''}
            onChange={e => update('programType', e.target.value)}
          >
            <option value="">Select…</option>
            <option value="standalone">Standalone</option>
            <option value="part_of_program">Part of a larger program</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">How would the test be integrated with your system?</label>
          <select
            className="w-full rounded-md border bg-white/5 px-3 py-2"
            value={data.integration ?? ''}
            onChange={e => update('integration', e.target.value)}
          >
            <option value="">Select integration…</option>
            {INTEGRATIONS.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Will the test be free, paid, or tiered?</label>
          <select
            className="w-full rounded-md border bg-white/5 px-3 py-2"
            value={data.pricingModel ?? ''}
            onChange={e => update('pricingModel', e.target.value as Goals['pricingModel'])}
          >
            <option value="">Select pricing…</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
            <option value="tiered">Tiered</option>
          </select>
        </div>
      </div>

      {(['paid','tiered'] as const).includes((data.pricingModel ?? 'free') as any) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Price Point (if paid)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-md border bg-white/5 px-3 py-2"
              value={data.pricePoint ?? ''}
              onChange={e => {
                const v = e.target.value;
                update('pricePoint', v === '' ? '' : Number(v));
              }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <a className="px-4 py-2 rounded-xl border" href="/onboarding/branding">Back</a>
        <button
          onClick={() => save()}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => save(() => window.location.assign('/admin/framework'))}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save & Continue to Framework'}
        </button>
      </div>
    </div>
  );
}

function TA({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <textarea
        rows={3}
        className="w-full rounded-md border bg-white/5 px-3 py-2"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
