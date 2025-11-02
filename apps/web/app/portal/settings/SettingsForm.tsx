'use client';

import * as React from 'react';

type SettingsPayload = {
  companyName: string;
  primaryColor: string; // e.g., #111827
  logoUrl: string;      // http(s) image
  supportEmail: string; // contact email
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export default function SettingsForm({ initial }: { initial: SettingsPayload }) {
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
