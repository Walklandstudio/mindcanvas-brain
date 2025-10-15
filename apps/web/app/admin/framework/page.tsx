"use client";

import { useEffect, useMemo, useState } from "react";

type GoalsState = { industry?: string; sector?: string; primary_goal?: string };
type Preview = {
  frequencies: Record<"A"|"B"|"C"|"D", string>;
  profiles: { name: string; frequency: "A"|"B"|"C"|"D" }[];
  imagePrompts?: Record<"A"|"B"|"C"|"D", string>;
};

export default function FrameworkPage() {
  const [orgId, setOrgId] = useState("");
  const [goals, setGoals] = useState<GoalsState | null>(null);
  const [orgName, setOrgName] = useState("");
  const [brandTone, setBrandTone] = useState("confident, modern, human");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    const fromStorage = (typeof window !== "undefined" && localStorage.getItem("mc_org_id")) || "";
    const fromUrl = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("orgId")) || "";
    const val = (fromStorage || fromUrl || "").replace(/^:/, "").trim();
    setOrgId(val);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (mounted) setGoals(j?.data || null);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load goals");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const canPreview = useMemo(() => !loading && !busy, [loading, busy]);
  const canSave = useMemo(() => !loading && !busy && !!orgId && !!preview, [loading, busy, orgId, preview]);

  async function handleGenerate(dryRun: boolean) {
    try {
      setBusy(true);
      setErr("");

      const payload = {
        orgId: dryRun ? undefined : orgId || undefined,
        orgName: orgName || undefined,
        industry: goals?.industry || "General",
        sector: goals?.sector || "General",
        primaryGoal: goals?.primary_goal || "Improve team performance",
        brandTone: brandTone || "confident, modern, human",
        dryRun, // <— new flag
      };

      const res = await fetch("/api/admin/framework/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(j?.error || "Framework generation failed");

      if (j?.preview) {
        setPreview(j.preview);
      } else if (j?.framework) {
        // We saved to DB successfully
        setPreview(j.framework.meta || null);
        alert("Framework created successfully.");
        // e.g., navigate to a details page if you have one
        // window.location.href = `/admin/framework/${j.framework.id}`;
      } else {
        throw new Error("Unexpected response");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to generate framework");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Framework Generator</h1>
      <p className="text-white/70 mt-1">We’ll use your Goals plus AI to seed a 4×8 framework for your organization.</p>

      {loading && <p className="mt-4 text-white/70">Loading…</p>}

      {!loading && !orgId && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-400/40 text-yellow-100 text-sm">
          No organization id detected. You can still <b>Preview</b> your framework.
          Add <code>?orgId=&lt;id&gt;</code> or set it earlier to enable <b>Save</b>.
        </div>
      )}

      {err && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">
          {err}
        </div>
      )}

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
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/onboarding/goals">Back</a>
        <button
          onClick={() => handleGenerate(true)}
          disabled={!canPreview}
          className="px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-60"
        >
          {busy ? "Generating…" : "Preview Framework"}
        </button>
        <button
          onClick={() => handleGenerate(false)}
          disabled={!canSave}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save Framework"}
        </button>
      </div>

      {/* Preview grid */}
      {preview && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Preview</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {(["A","B","C","D"] as const).map((f) => (
              <div key={f} className="rounded-lg border border-white/10 p-4">
                <div className="text-sm text-white/60">Frequency {f}</div>
                <div className="text-lg font-medium">{preview.frequencies[f]}</div>
                <ul className="mt-3 list-disc pl-5 text-white/90">
                  {preview.profiles.filter(p => p.frequency === f).map((p, i) => (
                    <li key={`${f}-${i}`}>{p.name}</li>
                  ))}
                </ul>
                {preview.imagePrompts?.[f as "A"|"B"|"C"|"D"] && (
                  <p className="mt-3 text-xs text-white/50">
                    Image prompt: {preview.imagePrompts[f as "A"|"B"|"C"|"D"]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-white/50">orgId: <code>{orgId || "(not set)"}</code></p>
    </main>
  );
}
