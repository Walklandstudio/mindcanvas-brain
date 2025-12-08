// apps/web/app/portal/[slug]/profile/ProfileClient.tsx
'use client';

import { useEffect, useState } from "react";
import type { OrgSettings } from "@/types/orgSettings";

export default function ProfileClient({ slug }: { slug: string }) {
  const [org, setOrg] = useState<OrgSettings | null>(null);
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
        if (!res.ok) throw new Error(json.error || "Failed to load profile");
        if (!cancelled) setOrg(json.org);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e.message || "Something went wrong");
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
      const res = await fetch("/api/portal/org/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(org),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save profile");
      setOrg(json.org);
      setSaved(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function updateField<K extends keyof OrgSettings>(
    key: K,
    value: OrgSettings[K]
  ) {
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

      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Basic Info</h2>
        <Field
          label="Name"
          value={org.name}
          onChange={(v) => updateField("name", v)}
        />
        <Field
          label="Slug"
          value={org.slug}
          disabled
          help="Used in URLs; cannot be changed."
        />
        <Field
          label="Industry"
          value={org.industry ?? ""}
          onChange={(v) => updateField("industry", v)}
        />
        <TextareaField
          label="Short Bio"
          value={org.short_bio ?? ""}
          onChange={(v) => updateField("short_bio", v)}
          rows={3}
        />
      </section>

      {/* Branding */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Branding</h2>
        <Field
          label="Logo URL"
          value={org.logo_url ?? ""}
          onChange={(v) => updateField("logo_url", v)}
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorField
            label="Primary"
            value={org.brand_primary ?? "#0F172A"}
            onChange={(v) => updateField("brand_primary", v)}
          />
          <ColorField
            label="Secondary"
            value={org.brand_secondary ?? "#38BDF8"}
            onChange={(v) => updateField("brand_secondary", v)}
          />
          <ColorField
            label="Background"
            value={org.brand_background ?? "#020617"}
            onChange={(v) => updateField("brand_background", v)}
          />
          <ColorField
            label="Text"
            value={org.brand_text ?? "#FFFFFF"}
            onChange={(v) => updateField("brand_text", v)}
          />
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Contact</h2>
        <Field
          label="Primary Contact Name"
          value={org.primary_contact_name ?? ""}
          onChange={(v) => updateField("primary_contact_name", v)}
        />
        <Field
          label="Primary Contact Email"
          value={org.primary_contact_email ?? ""}
          onChange={(v) => updateField("primary_contact_email", v)}
        />
        <Field
          label="Support Email"
          value={org.support_email ?? ""}
          onChange={(v) => updateField("support_email", v)}
        />
        <Field
          label="Website URL"
          value={org.website_url ?? ""}
          onChange={(v) => updateField("website_url", v)}
        />
      </section>

      {/* Report defaults */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Report Defaults</h2>
        <Field
          label="Report From Name"
          value={org.report_from_name ?? ""}
          onChange={(v) => updateField("report_from_name", v)}
        />
        <Field
          label="Report From Email"
          value={org.report_from_email ?? ""}
          onChange={(v) => updateField("report_from_email", v)}
        />
        <TextareaField
          label="Sign-off Line"
          value={org.report_signoff_line ?? ""}
          onChange={(v) => updateField("report_signoff_line", v)}
          rows={2}
        />
        <TextareaField
          label="Footer Notes"
          value={org.report_footer_notes ?? ""}
          onChange={(v) => updateField("report_footer_notes", v)}
          rows={2}
        />
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={handleSave}
          className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  help,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
        value={value}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      {help && <p className="mt-1 text-xs text-slate-400">{help}</p>}
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <textarea
        className="w-full rounded-md border bg-slate-900/60 border-slate-700 px-3 py-2 text-sm"
        rows={rows ?? 3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
