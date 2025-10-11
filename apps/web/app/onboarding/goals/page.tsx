// apps/web/app/onboarding/goals/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GoalsData = {
  industry?: string;
  target_audience?: string;
  outcomes?: string;
  integrations?: string[];
  pricing_intent?: "free" | "paid" | "both" | "";
  notes?: string;
};

export default function GoalsPage() {
  const router = useRouter();
  const [data, setData] = useState<GoalsData>({
    industry: "",
    target_audience: "",
    outcomes: "",
    integrations: [],
    pricing_intent: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  // Load existing
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onboarding/get?step=goals`, { cache: "no-store" });
        const json = await res.json();
        if (json?.data) setData({ ...data, ...json.data });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/onboarding/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "goals", data }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage("Saved ✓");
    } catch (e: any) {
      console.error(e);
      setMessage("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveAndNext = async () => {
    await save();
    router.push("/admin/framework");
  };

  if (loading) return <div className="p-8 text-white">Loading…</div>;

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <p className="text-white/80 mt-1">Tell us what you’re aiming to achieve.</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="block text-sm mb-1">Industry</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.industry ?? ""}
            onChange={(e) => setData((d) => ({ ...d, industry: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Target audience</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.target_audience ?? ""}
            onChange={(e) => setData((d) => ({ ...d, target_audience: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Desired outcomes</span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3 min-h-[110px]"
            value={data.outcomes ?? ""}
            onChange={(e) => setData((d) => ({ ...d, outcomes: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Integrations (comma-separated)</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={(data.integrations ?? []).join(", ")}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                integrations: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Pricing intent</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.pricing_intent ?? ""}
            onChange={(e) => setData((d) => ({ ...d, pricing_intent: e.target.value as any }))}
          >
            <option value="">Choose…</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
            <option value="both">Both</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Notes</span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3 min-h-[90px]"
            value={data.notes ?? ""}
            onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
          />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={saveAndNext}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60"
        >
          Save & Next →
        </button>
        {message && <span className="text-white/80">{message}</span>}
      </div>
    </main>
  );
}
