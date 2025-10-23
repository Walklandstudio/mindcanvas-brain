// apps/web/app/portal/settings/page.tsx
import 'server-only';
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export default async function PortalSettingsPage() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">No active organization.</p>
      </div>
    );
  }

  // Best-effort: show current org name/slug for context
  const { data: org } = await sb
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .maybeSingle();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        {org && (
          <p className="mt-1 text-sm text-gray-600">
            Editing settings for <span className="font-medium">{org.name}</span>{' '}
            <span className="text-gray-500">({org.slug})</span>
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Branding */}
        <section className="rounded-xl border p-4 space-y-4">
          <h2 className="font-medium">Branding</h2>
          <SettingsForm
            initial={{
              companyName: org?.name ?? '',
              primaryColor: '',
              logoUrl: '',
              supportEmail: '',
            }}
          />
        </section>

        {/* Tips / Preview placeholder */}
        <section className="rounded-xl border p-4 space-y-3">
          <h2 className="font-medium">Tips</h2>
          <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
            <li>
              <span className="font-medium">Company Name</span> appears on taker
              pages and reports.
            </li>
            <li>
              <span className="font-medium">Primary Color</span> should be a HEX
              (e.g. <code>#111827</code>)—used for buttons and accents.
            </li>
            <li>
              <span className="font-medium">Logo URL</span> can be any public
              image (recommended ~512×512 PNG/SVG).
            </li>
            <li>
              <span className="font-medium">Support Email</span> is shown on
              invites and the completion screen.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ===========================
   Client form
   =========================== */
'use client';

import * as React from 'react';

type SettingsPayload = {
  companyName: string;
  primaryColor: string; // e.g., #111827
  logoUrl: string;      // http(s) image
  supportEmail: string; // contact email
};

function SettingsForm({ initial }: { initial: SettingsPayload }) {
  const [form, setForm] = React.useState<SettingsPayload>(initial);
  const [busy, setBusy] = React.useState(false);
  const [ok, setOk] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function update<K extends keyof SettingsPayload>(key: K, v: SettingsPayload[K]) {
    setForm(prev => ({ ...prev, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOk(null);
    setErr(null);

    try {
      const res = await fetch('/api/portal/settings/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setOk('Settings saved.');
    } catch (e: any) {
      setErr(e?.message || 'Failed to save settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Company Name">
        <input
          className="w-full px-3 py-2 border rounded-lg text-sm"
          value={form.companyName}
          onChange={e => update('companyName', e.target.value)}
          placeholder="Team Puzzle"
        />
      </Field>

      <Field label="Primary Color (HEX)">
        <div className="flex gap-2 items-center">
          <input
            className="w-full px-3 py-2 border rounded-lg text-sm"
            value={form.primaryColor}
            onChange={e => update('primaryColor', e.target.value)}
            placeholder="#111827"
          />
          <div
            aria-hidden
            className="w-8 h-8 rounded border"
            style={{ background: form.primaryColor || '#ffffff' }}
            title="Preview"
          />
        </div>
      </Field>

      <Field label="Logo URL">
        <input
          className="w-full px-3 py-2 border rounded-lg text-sm"
          value={form.logoUrl}
          onChange={e => update('logoUrl', e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </Field>

      <Field label="Support Email">
        <input
          type="email"
          className="w-full px-3 py-2 border rounded-lg text-sm"
          value={form.supportEmail}
          onChange={e => update('supportEmail', e.target.value)}
          placeholder="support@example.com"
        />
      </Field>

      <div className="pt-2 flex items-center gap-2">
        <button
          type="submit"
          className="px-3 py-2 border rounded-lg text-sm disabled:opacity-60"
          disabled={busy}
        >
          {busy ? 'Saving…' : 'Save Settings'}
        </button>
        {ok && <span className="text-green-600 text-sm">{ok}</span>}
        {err && <span className="text-red-600 text-sm">{err}</span>}
      </div>
    </form>
  );
}
