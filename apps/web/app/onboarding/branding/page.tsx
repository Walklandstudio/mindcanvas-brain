"use client";
import { useEffect, useState } from "react";

type Branding = {
  primary?: string;
  secondary?: string;
  accent?: string;
  font?: string;
  logoUrl?: string;
  tone?: string;
};

export default function Page() {
  const [data, setData] = useState<Branding>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/onboarding");
      const j = await r.json();
      setData(j.onboarding?.branding ?? {});
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branding: data }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h1 className="text-xl font-semibold">Branding</h1>
      <p className="mt-1 text-sm text-slate-300">
        Set your brand colors, font, and voice.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-300">Primary</label>
          <input
            type="color"
            className="h-10 w-full rounded-md border border-white/10 bg-white/5"
            value={data.primary ?? "#2d8fc4"}
            onChange={(e) => setData({ ...data, primary: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Secondary</label>
          <input
            type="color"
            className="h-10 w-full rounded-md border border-white/10 bg-white/5"
            value={data.secondary ?? "#015a8b"}
            onChange={(e) => setData({ ...data, secondary: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Accent</label>
          <input
            type="color"
            className="h-10 w-full rounded-md border border-white/10 bg-white/5"
            value={data.accent ?? "#64bae2"}
            onChange={(e) => setData({ ...data, accent: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300">Font</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.font ?? ""}
            onChange={(e) => setData({ ...data, font: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Logo URL</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.logoUrl ?? ""}
            onChange={(e) => setData({ ...data, logoUrl: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm text-slate-300">Voice & Tone</label>
        <textarea
          rows={4}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
          value={data.tone ?? ""}
          onChange={(e) => setData({ ...data, tone: e.target.value })}
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <a
          href="/onboarding/company"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
        >
          Back
        </a>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <a
          href="/onboarding/goals"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
        >
          Next
        </a>
      </div>
    </div>
  );
}
