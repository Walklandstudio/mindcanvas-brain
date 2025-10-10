"use client";
import { useEffect, useState } from "react";

type Company = {
  website?: string;
  linkedin?: string;
  industry?: string;
  sector?: string;
  audience?: string;
};

export default function Page() {
  const [data, setData] = useState<Company>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/onboarding");
      const j = await r.json();
      setData(j.onboarding?.company ?? {});
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: data }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h1 className="text-xl font-semibold">Company</h1>
      <p className="mt-1 text-sm text-slate-300">Tell us about your org.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-300">Website</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.website ?? ""}
            onChange={(e) => setData({ ...data, website: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300">LinkedIn</label>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
              value={data.linkedin ?? ""}
              onChange={(e) => setData({ ...data, linkedin: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Industry</label>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
              value={data.industry ?? ""}
              onChange={(e) => setData({ ...data, industry: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300">Sector</label>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
              value={data.sector ?? ""}
              onChange={(e) => setData({ ...data, sector: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Audience</label>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
              value={data.audience ?? ""}
              onChange={(e) => setData({ ...data, audience: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <a
          href="/onboarding/create-account"
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
          href="/onboarding/branding"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
        >
          Next
        </a>
      </div>
    </div>
  );
}
