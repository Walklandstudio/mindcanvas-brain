// apps/web/app/onboarding/goals/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type GoalsState = {
  industry?: string;
  sector?: string;
  primary_goal?: string;
  align_with_mission?: string;
  desired_outcomes?: string;
  audience?: string;
  audience_challenges?: string;
  other_insights?: string;
  industry_relevant_info?: string;
  standalone_or_program?: string;
  integration?: string;
  pricing_model?: "free" | "paid" | "tiered" | "";
  price_point?: number | null;
};

const DEFAULTS: GoalsState = {
  industry: "",
  sector: "",
  primary_goal: "",
  align_with_mission: "",
  desired_outcomes: "",
  audience: "",
  audience_challenges: "",
  other_insights: "",
  industry_relevant_info: "",
  standalone_or_program: "",
  integration: "",
  pricing_model: "",
  price_point: null,
};

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Other",
];

const SECTORS = [
  "B2B",
  "B2C",
  "Public Sector",
  "Nonprofit",
  "Enterprise",
  "SMB",
  "Startup",
];

const INTEGRATIONS = [
  "Standalone",
  "Zapier",
  "Webhook",
  "HubSpot",
  "Salesforce",
  "Google Sheets",
  "Slack",
  "Other",
];

export default function GoalsPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<GoalsState>(DEFAULTS);

  // Read orgId from localStorage or ?orgId=... and normalize
  useEffect(() => {
    const fromStorage =
      (typeof window !== "undefined" && localStorage.getItem("mc_org_id")) || "";
    const fromUrl =
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("orgId")) ||
      "";
    const val = (fromStorage || fromUrl || "").replace(/^:/, "").trim();
    setOrgId(val);
  }, []);

  // Initial load for this step (optional API you already wired)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /api/onboarding/get failed (${res.status})`);
        const j = await res.json();
        if (mounted) {
          setData({ ...DEFAULTS, ...(j?.data || {}) });
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load goals");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function save(goNext?: boolean) {
    setSaving(true);
    setErr("");
    try {
      if (!orgId) {
        throw new Error(
          "Missing organization id. Please restart onboarding or go back a step so we can capture your org."
        );
      }

      const res = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ include orgId so the API route can validate & write
        body: JSON.stringify({ orgId, step: "goals", data }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to save");
      setSavedTick((x) => x + 1);
      if (goNext) router.push("/admin/framework");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const canSave = useMemo(() => !loading && !saving && !!orgId, [loading, saving, orgId]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-6 text-white">
        <h1 className="text-2xl font-semibold">Profile Test Goals</h1>
        <p className="text-white/70 mt-2">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Step 4: Profile Test Goals</h1>
      <p className="text-white/70 mt-1">
        Define the intent and shape of your organization’s test. These answers will guide the Framework generator.
      </p>

      {/* Helpful banner if orgId is missing */}
      {!orgId && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-400/40 text-yellow-100 text-sm">
          We couldn’t detect your organization id. Please go back to the previous step to capture it,
          or add <code>?orgId=&lt;your-id&gt;</code> to the URL.
        </div>
      )}

      {err && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">
          {err}
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {/* Industry */}
        <label className="block">
          <span className="block text-sm mb-1">Industry</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.industry}
            onChange={(e) => setData((d) => ({ ...d, industry: e.target.value }))}
          >
            <option value="">Select…</option>
            {INDUSTRIES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>

        {/* Sector */}
        <label className="block">
          <span className="block text-sm mb-1">Sector</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.sector}
            onChange={(e) => setData((d) => ({ ...d, sector: e.target.value }))}
          >
            <option value="">Select…</option>
            {SECTORS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>

        {/* Primary goal */}
        <label className="block">
          <span className="block text-sm mb-1">What is the primary goal of the profile test?</span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={3}
            value={data.primary_goal || ""}
            onChange={(e) => setData((d) => ({ ...d, primary_goal: e.target.value }))}
          />
        </label>

        {/* Align with mission */}
        <label className="block">
          <span className="block text-sm mb-1">
            How does this test align with your company’s mission or vision?
          </span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={3}
            value={data.align_with_mission || ""}
            onChange={(e) => setData((d) => ({ ...d, align_with_mission: e.target.value }))}
          />
        </label>

        {/* Outcomes */}
        <label className="block">
          <span className="block text-sm mb-1">
            What specific outcomes would you like participants to achieve after completing the test?
          </span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={3}
            value={data.desired_outcomes || ""}
            onChange={(e) => setData((d) => ({ ...d, desired_outcomes: e.target.value }))}
          />
        </label>

        {/* Audience */}
        <label className="block">
          <span className="block text-sm mb-1">Who will primarily take this test?</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.audience || ""}
            onChange={(e) => setData((d) => ({ ...d, audience: e.target.value }))}
          />
        </label>

        {/* Audience challenges */}
        <label className="block">
          <span className="block text-sm mb-1">
            Are there any challenges your audience faces that the test could help address?
          </span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={3}
            value={data.audience_challenges || ""}
            onChange={(e) => setData((d) => ({ ...d, audience_challenges: e.target.value }))}
          />
        </label>

        {/* Other insights */}
        <label className="block">
          <span className="block text-sm mb-1">Other insights you want to collect as part of your questions?</span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={2}
            value={data.other_insights || ""}
            onChange={(e) => setData((d) => ({ ...d, other_insights: e.target.value }))}
          />
        </label>

        {/* Industry relevant info */}
        <label className="block">
          <span className="block text-sm mb-1">Industry-relevant info (revenue, targets, etc.)</span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={2}
            value={data.industry_relevant_info || ""}
            onChange={(e) => setData((d) => ({ ...d, industry_relevant_info: e.target.value }))}
          />
        </label>

        {/* Standalone or program */}
        <label className="block">
          <span className="block text-sm mb-1">Will the test be standalone or part of a larger program?</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.standalone_or_program || ""}
            onChange={(e) => setData((d) => ({ ...d, standalone_or_program: e.target.value }))}
          />
        </label>

        {/* Integration */}
        <label className="block">
          <span className="block text-sm mb-1">How would the test be integrated with your system?</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.integration || ""}
            onChange={(e) => setData((d) => ({ ...d, integration: e.target.value }))}
          >
            <option value="">Select…</option>
            {INTEGRATIONS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>

        {/* Pricing model + price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm mb-1">Will the test be free, paid, or tiered?</span>
            <select
              className="w-full rounded-lg bg-white text-black p-3"
              value={data.pricing_model || ""}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  pricing_model: (e.target.value as GoalsState["pricing_model"]) || "",
                }))
              }
            >
              <option value="">Select…</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="tiered">Tiered</option>
            </select>
          </label>

          <label className="block">
            <span className="block text-sm mb-1">Price Point (if paid)</span>
            <input
              type="number"
              className="w-full rounded-lg bg-white text-black p-3"
              value={data.price_point ?? ""}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  price_point: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              placeholder="0"
              min={0}
              step="0.01"
            />
          </label>
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 left-0 right-0 mt-8 bg-neutral-900/70 backdrop-blur border-t border-white/10">
        <div className="max-w-3xl mx-auto p-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/onboarding/branding")}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/20"
          >
            Back
          </button>
          <button
            onClick={() => save(false)}
            disabled={!canSave}
            className="px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={!canSave}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & Next"}
          </button>
          {savedTick > 0 && <span className="text-white/70 text-sm ml-1">Saved ✓</span>}
        </div>
      </div>

      {/* Debug hint (remove later) */}
      <p className="mt-4 text-xs text-white/50">
        orgId: <code>{orgId || "(not set)"}</code>
      </p>
    </main>
  );
}
