"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Goals = {
  industry?: string; sector?: string; primary_goal?: string;
  align_with_mission?: string; desired_outcomes?: string;
  audience?: string; audience_challenges?: string;
  other_insights?: string; industry_relevant_info?: string;
  standalone_or_program?: string; integration?: string;
  pricing_model?: "free" | "paid" | "tiered" | ""; price_point?: number | null;
};

type Preview = {
  frequencies: Record<"A"|"B"|"C"|"D", string>;
  profiles: { name: string; frequency: "A"|"B"|"C"|"D" }[];
};

export default function OnboardingSummaryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [orgName, setOrgName] = useState("Your Organization");
  const [brandTone] = useState("confident, modern, human");
  const [goals, setGoals] = useState<Goals>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [bullets, setBullets] = useState<string[]>([]);
  const [industry, setIndustry] = useState("—");
  const [sector, setSector] = useState("—");

  // Get saved goals from your existing endpoint, then ask server to summarise
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const gRes = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
        const gJson = await gRes.json().catch(() => ({}));
        const g = (gJson?.data || {}) as Goals;

        const sRes = await fetch("/api/onboarding/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgName, goals: g, brandTone }),
        });
        const sJson = await sRes.json();
        if (!sRes.ok) throw new Error(sJson?.error || "Failed to build summary");

        if (mounted) {
          setGoals(g);
          setOrgName(sJson.summary?.orgName || orgName);
          setBullets(sJson.summary?.bullets || []);
          setIndustry(sJson.summary?.industry || "—");
          setSector(sJson.summary?.sector || "—");
          setPreview(sJson.preview);
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message || "Failed to load summary");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Onboarding Summary</h1>
      <p className="text-white/70 mt-1">Review the AI-composed summary. If it looks right, proceed to Framework.</p>

      {loading && <p className="mt-4 text-white/70">Building summary…</p>}
      {err && <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>}

      {!loading && !err && (
        <>
          <div className="mt-6 grid gap-3 text-sm">
            <div><span className="text-white/60">Organization:</span> {orgName}</div>
            <div><span className="text-white/60">Industry:</span> {industry}</div>
            <div><span className="text-white/60">Sector:</span> {sector}</div>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 p-4">
            <h2 className="font-medium mb-2">Key points</h2>
            <ul className="list-disc pl-5 space-y-1">
              {bullets.length === 0 && <li className="text-white/60">No key points detected.</li>}
              {bullets.map((b, i) => (<li key={i}>{b}</li>))}
            </ul>
          </div>

          {preview && (
            <div className="mt-6 rounded-lg border border-white/10 p-4">
              <h2 className="font-medium mb-3">Proposed 4×8 (names only)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {(["A","B","C","D"] as const).map((f) => (
                  <div key={f} className="rounded-lg bg-white/5 p-3">
                    <div className="text-xs text-white/60">Frequency {f}</div>
                    <div className="text-lg font-semibold">{preview.frequencies[f]}</div>
                    <ul className="mt-2 list-disc pl-5">
                      {preview.profiles.filter(p => p.frequency === f).map((p, idx) => (
                        <li key={`${f}-${idx}`}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/onboarding/goals">Back</a>
            <button
              onClick={() => router.push("/admin/framework")}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium"
            >
              Agree & proceed to Framework
            </button>
          </div>
        </>
      )}
    </main>
  );
}
