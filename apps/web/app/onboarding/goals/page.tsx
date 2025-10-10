'use client';
import { useEffect, useState } from 'react';

type Goals = {
  industry?: string;
  sector?: string;
  primaryGoal?: string;
  missionAlignment?: string;
  desiredOutcomes?: string;
  audience?: string;
  audienceChallenges?: string;
  extraInsights?: string;
  industryInfo?: string;          // revenue, targets, etc.
  programContext?: string;        // standalone or part of a program
  integration?: string;           // dropdown
  pricingModel?: 'free' | 'paid' | 'tiered';
  pricePoint?: number | '';       // only for paid
};

const INDUSTRIES = [
  'Technology','SaaS','Healthcare','Education','Finance','Professional Services',
  'E-commerce','Media','Manufacturing','Nonprofit','Government','Other'
];

const SECTORS = ['B2B','B2C','Enterprise','SMB','Startup','Agency','Internal HR/L&D','Other'];

const INTEGRATIONS = [
  'Standalone (share link only)',
  'Embedded in website (iframe)',
  'Zapier / Make',
  'Webhook → your system',
  'LMS (SCORM/xAPI pseudo via link)',
  'Custom (we’ll define)'
];

const PRICING = [
  { value: 'free',   label: 'Free' },
  { value: 'paid',   label: 'Paid' },
  { value: 'tiered', label: 'Tiered' }
] as const;

export default function Page() {
  const [data, setData] = useState<Goals>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/onboarding');
      const j = await r.json();
      setData(j.onboarding?.goals ?? {});
    })();
  }, []);

  const isPaid = data.pricingModel === 'paid';

  async function save() {
    setSaving(true);
    try {
      const payload: Goals = {
        ...data,
        pricePoint:
          isPaid && data.pricePoint !== '' && data.pricePoint != null
            ? Number(data.pricePoint)
            : undefined,
      };
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: payload }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h1 className="text-xl font-semibold">Profile Test Goals</h1>
      <p className="mt-1 text-sm text-slate-300">
        Define the outcomes and go-to-market details for your Signature test.
      </p>

      <div className="mt-6 space-y-6">
        {/* Industry & Sector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Industry"
            value={data.industry ?? ''}
            onChange={(v) => setData({ ...data, industry: v })}
            options={INDUSTRIES}
          />
          <Select
            label="Sector"
            value={data.sector ?? ''}
            onChange={(v) => setData({ ...data, sector: v })}
            options={SECTORS}
          />
        </div>

        {/* Text questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextArea
            label="What is the primary goal of the profile test?"
            value={data.primaryGoal ?? ''}
            onChange={(v) => setData({ ...data, primaryGoal: v })}
          />
          <TextArea
            label="How does this test align with your company’s mission or vision?"
            value={data.missionAlignment ?? ''}
            onChange={(v) => setData({ ...data, missionAlignment: v })}
          />
          <TextArea
            label="What specific outcomes would you like participants to achieve after completing the test?"
            value={data.desiredOutcomes ?? ''}
            onChange={(v) => setData({ ...data, desiredOutcomes: v })}
          />
          <TextArea
            label="Who will primarily take this test?"
            value={data.audience ?? ''}
            onChange={(v) => setData({ ...data, audience: v })}
          />
          <TextArea
            label="Are there any challenges your audience faces that the test could help address?"
            value={data.audienceChallenges ?? ''}
            onChange={(v) => setData({ ...data, audienceChallenges: v })}
          />
          <TextArea
            label="Other insights you want to collect as part of your questions?"
            value={data.extraInsights ?? ''}
            onChange={(v) => setData({ ...data, extraInsights: v })}
          />
          <TextArea
            label="Industry-relevant info (revenue, targets, etc.)"
            value={data.industryInfo ?? ''}
            onChange={(v) => setData({ ...data, industryInfo: v })}
          />
          <TextArea
            label="Will the test be standalone or part of a larger program?"
            value={data.programContext ?? ''}
            onChange={(v) => setData({ ...data, programContext: v })}
          />
        </div>

        {/* Integration & Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-300">How would the test be integrated with your system?</label>
            <select
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
              value={data.integration ?? ''}
              onChange={(e) => setData({ ...data, integration: e.target.value })}
            >
              <option value="">Select…</option>
              {INTEGRATIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300">Will the test be free, paid, or tiered?</label>
            <select
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
              value={data.pricingModel ?? ''}
              onChange={(e) => setData({ ...data, pricingModel: e.target.value as Goals['pricingModel'] })}
            >
              <option value="">Select…</option>
              {PRICING.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Price when Paid */}
        {isPaid && (
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-300">Price Point (if paid)</label>
              <input
                type="number" min={0} step="0.01"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
                value={data.pricePoint ?? ''}
                onChange={(e) =>
                  setData({
                    ...data,
                    pricePoint: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                placeholder="e.g. 49"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a href="/onboarding/branding" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm">
            Back
          </a>
          <button
            onClick={save}
            disabled={saving || (isPaid && (data.pricePoint === '' || data.pricePoint == null))}
            className="rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))' }}
          >
            {saving ? 'Saving…' : 'Save & Finish'}
          </button>
          <a href="/dashboard" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm">
            Done
          </a>
        </div>
      </div>
    </div>
  );
}

function TextArea({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <textarea
        rows={3}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <select
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
