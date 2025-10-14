"use client";

import { useEffect, useState } from "react";
import { saveOnboarding } from "../_lib/save";

export default function CompanyStep() {
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const v = sessionStorage.getItem("onb_company_name") || "";
    if (v) setCompanyName(v);
  }, []);

  const onSave = async () => {
    await saveOnboarding({ company: { name: companyName } });
    sessionStorage.setItem("onb_company_name", companyName);
    document.dispatchEvent(new CustomEvent("onboarding:progress:recompute"));
    window.location.href = "/onboarding/branding";
  };

  return (
    <main className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Company</h1>

      <div className="space-y-3">
        <label className="block text-sm text-gray-700">Company Name</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Corp"
        />
      </div>

      <div className="flex items-center justify-between">
        <a className="btn-secondary" href="/onboarding/create-account">← Back</a>
        <button onClick={onSave} className="btn-primary">Save & Continue</button>
      </div>
    </main>
  );
}
