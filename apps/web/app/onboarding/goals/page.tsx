"use client";
import { useEffect, useState } from "react";

type Goals = { primaryGoal?: string; successMetric?: string; launchDate?: string };

export default function Page() {
  const [data, setData] = useState<Goals>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/onboarding");
      const j = await r.json();
      setData(j.onboarding?.goals ?? {});
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: data }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h1 className="text-xl font-semibold">Goals</h1>
      <p className="mt-1 text-sm text-slate-300">Define success for your rollout.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-300">Primary Goal</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.primaryGoal ?? ""}
            onChange={(e) => setData({ ...data, primaryGoal: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Success Metric</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.successMetric ?? ""}
            onChange={(e) =>
              setData({ ...data, successMetric: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Launch Date</label>
          <input
            type="date"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.launchDate ?? ""}
            onChange={(e) => setData({ ...data, launchDate: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <a
          href="/onboarding/branding"
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
          {saving ? "Saving…" : "Save & Finish"}
        </button>
        <a
          href="/dashboard"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
        >
          Done
        </a>
      </div>
    </div>
  );
}
