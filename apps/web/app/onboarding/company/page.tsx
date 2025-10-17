"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CompanyData = {
  website: string;
  linkedin: string;
  industry: string;
  sector: string;
};

type OnboardingRecord = {
  company?: Partial<CompanyData>;
  // keep any other sections you store (branding, goals, etc.)
};

export default function CompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [industry, setIndustry] = useState("");
  const [sector, setSector] = useState("");

  // Load previously saved values
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/onboarding/get", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as OnboardingRecord;

        if (!cancelled && data?.company) {
          setWebsite(data.company.website ?? "");
          setLinkedin(data.company.linkedin ?? "");
          setIndustry(data.company.industry ?? "");
          setSector(data.company.sector ?? "");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load saved data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Simple progress (recompute on save): 4 fields here contribute 0–25%
  const stepProgress = useMemo(() => {
    let filled = 0;
    if (website.trim()) filled++;
    if (linkedin.trim()) filled++;
    if (industry.trim()) filled++;
    if (sector.trim()) filled++;
    return Math.round((filled / 4) * 100);
  }, [website, linkedin, industry, sector]);

  async function save(next?: "back" | "next") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          step: "company",
          data: { website, linkedin, industry, sector },
          // optional: let the server recompute progress and persist
          recomputeProgress: true,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Navigate if requested
      if (next === "back") router.push("/onboarding/create-account");
      if (next === "next") router.push("/onboarding/branding");
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Step 2 — Company Information</h1>
          <p className="text-white/60 text-sm">
            Tell us about your company. This informs your framework names and report copy.
          </p>
        </div>
        <div className="w-48">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${stepProgress}%` }}
              aria-label="Onboarding progress for this step"
            />
          </div>
          <div className="text-right text-xs text-white/70 mt-1">
            {stepProgress}% complete
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Website */}
        <label className="block">
          <span className="block text-sm mb-1 text-white/80">Company Website</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            className="mc-input"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>

        {/* Company LinkedIn */}
        <label className="block">
          <span className="block text-sm mb-1 text-white/80">Company LinkedIn</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/company/your-company"
            className="mc-input"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
          />
        </label>

        {/* Industry */}
        <label className="block">
          <span className="block text-sm mb-1 text-white/80">Industry</span>
          <input
            type="text"
            placeholder="e.g., Financial Services"
            className="mc-input"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </label>

        {/* Sector */}
        <label className="block">
          <span className="block text-sm mb-1 text-white/80">Sector</span>
          <input
            type="text"
            placeholder="e.g., FinTech / Payments"
            className="mc-input"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Link
            href="/onboarding/create-account"
            className="mc-btn-ghost"
            onClick={(e) => {
              e.preventDefault();
              save("back");
            }}
          >
            ← Back
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="mc-btn-ghost"
            disabled={saving || loading}
            onClick={() => save()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            className="mc-btn-primary"
            disabled={saving || loading}
            onClick={() => save("next")}
          >
            Continue →
          </button>
        </div>
      </div>

      {/* Subtle “all changes saved” note */}
      <p className="text-xs text-white/50">
        Your progress updates as you save. You can revisit this step anytime.
      </p>
    </div>
  );
}
