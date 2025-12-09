// apps/web/app/admin/clients/new/NewClientWizardClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrgTemplatePackId } from '@/lib/orgTemplatePacks';
import { ORG_TEMPLATE_PACKS } from '@/lib/orgTemplatePacks';

type Step = 1 | 2;

export default function NewClientWizardClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    industry: '',
    short_bio: '',
    time_zone: 'Africa/Johannesburg',
    logo_url: '',
    brand_primary: '#0F172A',
    brand_secondary: '#38BDF8',
    brand_background: '#020617',
    brand_text: '#FFFFFF',
    brand_accent: '#F97316',
    primary_contact_name: '',
    primary_contact_email: '',
    support_email: '',
    website_url: '',
    phone_number: '',
    report_from_name: '',
    report_from_email: '',
    report_signoff_line: 'Warm regards,\nThe [Client] Team',
    report_footer_notes:
      'This report is confidential and intended solely for the recipient.',
    owner_auth_user_id: '',
  });

  const [selectedPack, setSelectedPack] =
    useState<OrgTemplatePackId>('qsc-leaders');

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateOrg() {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create org');
      }

      setCreatedOrgId(json.org.id);
      setStep(2);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleProvisionPack() {
    if (!createdOrgId) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/orgs/${createdOrgId}/provision-pack`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId: selectedPack }),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to provision template pack');
      }

      // Optionally redirect to some admin org page
      router.push(`/admin/clients/${createdOrgId}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <h1 className="text-2xl font-semibold">Create New Client</h1>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Organisation Name
            </label>
            <input
              className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                updateField('name', v);
                if (!form.slug) {
                  updateField(
                    'slug',
                    v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  );
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Slug (portal URL)
              </label>
              <input
                className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">
                Used for URLs like <code>/portal/{form.slug || 'client'}</code>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Industry
              </label>
              <input
                className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
                value={form.industry}
                onChange={(e) => updateField('industry', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Short Bio</label>
            <textarea
              className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
              rows={3}
              value={form.short_bio}
              onChange={(e) => updateField('short_bio', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Website URL
            </label>
            <input
              className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
              value={form.website_url}
              onChange={(e) => updateField('website_url', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Brand Primary
              </label>
              <input
                type="color"
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/60"
                value={form.brand_primary}
                onChange={(e) => updateField('brand_primary', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Background
              </label>
              <input
                type="color"
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/60"
                value={form.brand_background}
                onChange={(e) =>
                  updateField('brand_background', e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Text</label>
              <input
                type="color"
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/60"
                value={form.brand_text}
                onChange={(e) => updateField('brand_text', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Primary Contact Name
              </label>
              <input
                className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
                value={form.primary_contact_name}
                onChange={(e) =>
                  updateField('primary_contact_name', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Primary Contact Email
              </label>
              <input
                className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
                value={form.primary_contact_email}
                onChange={(e) =>
                  updateField('primary_contact_email', e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Support Email
            </label>
            <input
              className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
              value={form.support_email}
              onChange={(e) => updateField('support_email', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Report From Name
            </label>
            <input
              className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
              value={form.report_from_name}
              onChange={(e) => updateField('report_from_name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Report From Email
            </label>
            <input
              className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
              value={form.report_from_email}
              onChange={(e) => updateField('report_from_email', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleCreateOrg}
              className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create & Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && createdOrgId && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Attach Template Pack</h2>
          <p className="text-sm text-slate-400">
            Choose which base configuration to provision for this client.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ORG_TEMPLATE_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPack(pack.id)}
                className={`border rounded-lg p-4 text-left text-sm ${
                  selectedPack === pack.id
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-900/40'
                }`}
              >
                <div className="font-medium mb-1">{pack.label}</div>
                <div className="text-xs text-slate-400">{pack.description}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(1)}
              className="inline-flex items-center rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/60 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleProvisionPack}
              className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? 'Provisioning…' : 'Provision Pack'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
