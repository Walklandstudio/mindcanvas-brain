"use client";

import { useEffect, useMemo, useState } from "react";

type GoalsState = {
  industry?: string;
  sector?: string;
  primary_goal?: string;
  // you can add more fields if needed
};

export default function FrameworkPage() {
  const [orgId, setOrgId] = useState("");
  const [goals, setGoals] = useState<GoalsState | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [brandTone, setBrandTone] = useState<string>("confident, modern, human");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string>("");

  // Pull orgId from localStorage or ?orgId=
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

  // Load goals + orgName for context
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) load goals
        const resGoals = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        const jGoals = await resGoals.json().catch(() => ({}));
        if (mounted) setGoals(jGoals?.data || null);

        // 2) (optional) load orgName if you have an endpoint; otherwise leave input editable
        // If you don’t have an org-get API, we’ll let the user type orgName manually.
        // Example (commented out):
        // const resOrg = await fetch(`/api/orgs/get?id=${orgId}`, { cache: "no-store" });
        // const jOrg = await resOrg.json().catch(() => ({}));
        // if (mounted) setOrgName(jOrg?.data?.name || "");

      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [orgId]);

  const canGenerate = useMemo(() => !loading && !generating && !!orgId, [loading, generating, orgId]);

  async function handleGenerate() {
    try {
      setGenerating(true);
      setErr("");

      if (!orgId) throw new Error("Missing organization id");
      const payload = {
        orgId,
        orgName: orgName || undefined,
        industry: goals?.industry || "General",
        sector: goals?.sector || "General",
        primaryGoal: goals?.primary_goal || "Improve team performance",
        brandTone: brandTone || "confident, modern, human",
      };

      const res = await fetch("/api/admin/framework/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Framework generation failed");

      // Success — you can navigate to a detail page or show a confirmation
      alert("Framework created successfully.");
      // e.g., window.location.href = `/admin/framework/${j.framework.id}`;
    } catch (e: any) {
      setErr(e?.message || "Failed to generate framework");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Framework Generator</h1>
      <p className="text-white/70 mt-1">
        We’ll use your Goals plus AI to seed a 4×8 framework for your organization.
      </p>

      {loading && <p className="mt-4 text-white/70">Loading…</p>}

      {!loading && !orgId && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-400/40 text-yellow-100 text-sm">
          We couldn’t detect your organization id. Go back to onboarding or add <code>?orgId=&lt;id&gt;</code> to the URL.
        </div>
      )}

      {err && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">
          {err}
        </div>
      )}

      {/* Context fields */}
      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="block text-sm mb-1">Organization Name (optional override)</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g., Team Puzzle"
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Brand Tone</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={brandTone}
            onChange={(e) => setBrandTone(e.target.value)}
            placeholder='e.g., "confident, modern, human"'
          />
        </label>

        <div className="rounded-lg bg-white/5 p-4 border border-white/10">
          <p className="text-sm text-white/70 mb-2">From Goals (read-only)</p>
          <div className="grid gap-2 text-sm">
            <div><span className="text-white/50">Industry:</span> {goals?.industry || "—"}</div>
            <div><span className="text-white/50">Sector:</span> {goals?.sector || "—"}</div>
            <div><span className="text-white/50">Primary Goal:</span> {goals?.primary_goal || "—"}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/onboarding/goals">
          Back
        </a>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate Framework"}
        </button>
      </div>

      <p className="mt-6 text-xs text-white/50">
        orgId: <code>{orgId || "(not set)"}</code>
      </p>
    </main>
  );
}
