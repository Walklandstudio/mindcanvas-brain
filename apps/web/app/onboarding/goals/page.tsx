// apps/web/app/onboarding/goals/page.tsx
"use client";

import { useEffect, useState } from "react";
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

const INDUSTRIES = ["Technology","Finance","Healthcare","Education","Retail","Manufacturing","Consulting","Other"];
const SECTORS = ["B2B","B2C","Public Sector","Nonprofit","Enterprise","SMB","Startup"];
const INTEGRATIONS = ["Standalone","Zapier","Webhook","HubSpot","Salesforce","Google Sheets","Slack","Other"];

export default function GoalsPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<GoalsState>(DEFAULTS);

  // Try to populate orgId, but DO NOT block UI if missing
  useEffect(() => {
    const fromStorage =
      (typeof window !== "undefined" && localStorage.getItem("mc_org_id")) || "";
    const fromUrl =
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("orgId")) || "";
    const val = (fromStorage || fromUrl || "").replace(/^:/, "").trim();
    setOrgId(val);
  }, []);

  // Load any existing goals (non-blocking)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (mounted) setData({ ...DEFAULTS, ...(j?.data || {}) });
      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load goals");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function save(goNext?: boolean) {
    setSaving(true);
    setErr("");
    try {
      // Send orgId if we have it; API tolerates missing id
      const res = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId || undefined, step: "goals", data }),
      });

      // We treat any response as OK to proceed (API is tolerant; we don't block UX)
      const j = await res.json().catch(() => ({}));
      if (!res.ok && j?.error) {
        // show message but don't block next
        setErr(j.error);
      }
      setSavedTick((x) => x + 1);

      if (goNext) {
        // Always allow the user forward — framework page can preview without orgId
        router.push("/admin/framework");
        return;
      }
    } catch (e: any) {
      // Show error but do not disable navigation forever
      setErr(e?.message || "Save failed (non-blocking)");
      if (goNext) router.push("/admin/framework");
    } finally {
      setSaving(false);
    }
  }

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

      {!orgId && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-400/40 text-yellow-100 text-sm">
          We couldn’t detect your organization id. You can still save and continue.
          (Add <code>?orgId=&lt;id&gt;</code> later or go back to capture it.)
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
            {INDUSTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
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
            {SECTORS.map((x) => <option key={x} value={x}>{x}</option>)}
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
          <span className="block text-sm mb-1">How does this test align with your company’s mission or vision?</span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={3}
            value={data.align_with_mission || ""}
            onChange={(e) => setData((d) => ({ ...d, align_with_mission: e.target.value }))}
          />
        </label>

        {/* Outcomes */}
        <label className="block">
          <span className="block text-sm mb-1">What specific outcomes would you like participants to achieve?</span>
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
          <span className="block text-sm mb-1">Audience challenges the test could help address</span>
          <textarea
            className="w-full rounded-lg bg-white text-black p-3"
            rows={3}
            value={data.audience_challenges || ""}
            onChange={(e) => setData((d) => ({ ...d, audience_challenges: e.target.value }))}
          />
        </label>

        {/* Other insights */}
        <label className="block">
          <span className="block text-sm mb-1">Other insights to collect</span>
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
          <span className="block text-sm mb-1">Standalone or part of a larger program?</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.standalone_or_program || ""}
            onChange={(e) => setData((d) => ({ ...d, standalone_or_program: e.target.value }))}
          />
        </label>

        {/* Integration */}
        <label className="block">
          <span className="block text-sm mb-1">Integration</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.integration || ""}
            onChange={(e) => setData((d) => ({ ...d, integration: e.target.value }))}
          >
            <option value="">Select…</option>
            {INTEGRATIONS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>

        {/* Pricing model + price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm mb-1">Free, paid, or tiered?</span>
            <select
              className="w-full rounded-lg bg-white text-black p-3"
              value={data.pricing_model || ""}
              onChange={(e) =>
                setData((d) => ({ ...d, pricing_model: (e.target.value as GoalsState["pricing_model"]) || "" }))
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
                setData((d) => ({ ...d, price_point: e.target.value === "" ? null : Number(e.target.value) }))
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
            disabled={saving}  // ✅ only disable during fetch
            className="px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}  // ✅ only disable during fetch
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & Next"}
          </button>
          {savedTick > 0 && <span className="text-white/70 text-sm ml-1">Saved ✓</span>}
        </div>
      </div>

      <p className="mt-4 text-xs text-white/50">
        orgId: <code>{orgId || "(not set)"}</code>
      </p>
    </main>
  );
}
