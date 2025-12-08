// apps/web/app/portal/[slug]/profile/ProfileClient.tsx
'use client';

import { useEffect, useState } from 'react';
import type { OrgProfile } from '@/types/org';

export default function ProfileClient({ slug }: { slug: string }) {
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadOrg() {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/portal/org/profile?slug=${slug}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load profile');
        if (!cancelled) setOrg(json.org);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e.message || 'Something went wrong');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    loadOrg();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSave() {
    if (!org) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/portal/org/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(org),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save profile');
      setOrg(json.org);
      setSaved(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function updateField<K extends keyof OrgProfile>(key: K, value: OrgProfile[K]) {
    if (!org) return;
    setOrg({ ...org, [key]: value });
    setSaved(false);
  }

  if (!org && busy) {
    return <div className="p-6 text-sm text-slate-300">Loading profile…</div>;
  }

  if (error && !org) {
    return (
      <div className="p-6 text-sm text-red-300">
        Error loading profile: {error}
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Organisation Profile</h1>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          Changes saved.
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Basic Info</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.slug}
            disabled
          />
          <p className="mt-1 text-xs text-slate-400">
            This is used in URLs and cannot be changed.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Industry</label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.industry ?? ''}
            onChange={(e) => updateField('industry', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Short Bio</label>
          <textarea
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            rows={3}
            value={org.short_bio ?? ''}
            onChange={(e) => updateField('short_bio', e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Branding</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.logo_url ?? ''}
            onChange={(e) => updateField('logo_url', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorField
            label="Primary"
            value={org.brand_primary ?? '#0F172A'}
            onChange={(v) => updateField('brand_primary', v)}
          />
          <ColorField
            label="Secondary"
            value={org.brand_secondary ?? '#38BDF8'}
            onChange={(v) => updateField('brand_secondary', v)}
          />
          <ColorField
            label="Background"
            value={org.brand_background ?? '#020617'}
            onChange={(v) => updateField('brand_background', v)}
          />
          <ColorField
            label="Text"
            value={org.brand_text ?? '#FFFFFF'}
            onChange={(v) => updateField('brand_text', v)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Contact</h2>
        <div>
          <label className="block text-sm font-medium mb-1">
            Primary Contact Name
          </label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.primary_contact_name ?? ''}
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
            value={org.primary_contact_email ?? ''}
            onChange={(e) =>
              updateField('primary_contact_email', e.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Support Email
          </label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.support_email ?? ''}
            onChange={(e) => updateField('support_email', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Website URL
          </label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.website_url ?? ''}
            onChange={(e) => updateField('website_url', e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Report Defaults</h2>
        <div>
          <label className="block text-sm font-medium mb-1">
            Report From Name
          </label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.report_from_name ?? ''}
            onChange={(e) =>
              updateField('report_from_name', e.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Report From Email
          </label>
          <input
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            value={org.report_from_email ?? ''}
            onChange={(e) =>
              updateField('report_from_email', e.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Sign-off Line
          </label>
          <textarea
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            rows={2}
            value={org.report_signoff_line ?? ''}
            onChange={(e) =>
              updateField('report_signoff_line', e.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Footer Notes
          </label>
          <textarea
            className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
            rows={2}
            value={org.report_footer_notes ?? ''}
            onChange={(e) =>
              updateField('report_footer_notes', e.target.value)
            }
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={handleSave}
          className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function ColorField({
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
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="color"
        className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        className="mt-1 w-full rounded-md border bg-slate-900/60 border-slate-700 px-2 py-1 text-xs font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
