// apps/web/app/onboarding/company/page.tsx
"use client";

import { useEffect, useState } from "react";
import { saveOnboarding } from "../_lib/save";

export default function CompanyStep() {
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [industry, setIndustry] = useState("");
  const [sector, setSector] = useState("");

  // Restore persisted values for a smooth revisit
  useEffect(() => {
    setWebsite(sessionStorage.getItem("onb_company_website") || "");
    setLinkedin(sessionStorage.getItem("onb_company_linkedin") || "");
    setIndustry(sessionStorage.getItem("onb_company_industry") || "");
    setSector(sessionStorage.getItem("onb_company_sector") || "");
  }, []);

  const onSave = async () => {
    await saveOnboarding({
      company: { website, linkedin, industry, sector },
    });

    // Persist for progress + preview
    sessionStorage.setItem("onb_company_website", website);
    sessionStorage.setItem("onb_company_linkedin", linkedin);
    sessionStorage.setItem("onb_company_industry", industry);
    sessionStorage.setItem("onb_company_sector", sector);

    // Nudge any progress bars to recompute
    document.dispatchEvent(new CustomEvent("onboarding:progress:recompute"));

    // Continue to Branding
    window.location.href = "/onboarding/branding";
  };

  return (
    <main className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Step 2 — Company Information</h1>
        <div className="text-sm text-gray-400">2 of 4</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Company website</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            inputMode="url"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Company LinkedIn</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://www.linkedin.com/company/your-company"
            inputMode="url"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Industry</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Software, Healthcare, Finance"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Sector</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="e.g., B2B SaaS, MedTech, Retail Banking"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <a className="btn-secondary" href="/onboarding/create-account">← Back</a>
        <button onClick={onSave} className="btn-primary">Save & Continue</button>
      </div>
    </main>
  );
}
