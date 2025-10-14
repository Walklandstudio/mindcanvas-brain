"use client";

import { useEffect, useState } from "react";

// Replace with your real save util/API
async function saveOnboarding(payload: any) {
  // Example: POST to /api/onboarding/save
  // await fetch("/api/onboarding/save", { method: "POST", body: JSON.stringify(payload) })
  await new Promise((r) => setTimeout(r, 250));
}

export default function BrandingStep() {
  const [logoUrl, setLogoUrl] = useState("");

  // Load persisted value on mount so preview survives revisit
  useEffect(() => {
    const persisted = sessionStorage.getItem("onb_branding_logoUrl") || "";
    if (persisted) setLogoUrl(persisted);
  }, []);

  const onSave = async () => {
    await saveOnboarding({ branding: { logoUrl } });
    // Persist for preview on revisit
    sessionStorage.setItem("onb_branding_logoUrl", logoUrl);
    // Recompute progress meter (simple signal; your Progress component listens for this)
    document.dispatchEvent(new CustomEvent("onboarding:progress:recompute"));
    // Navigate forward (replace with your next route)
    window.location.href = "/onboarding/(wizard)/goals";
  };

  return (
    <main className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Branding</h1>

      <div className="space-y-3">
        <label className="block text-sm text-gray-700">Logo URL</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />

        <div className="mt-4">
          <span className="text-sm text-gray-500">Preview</span>
          <div className="mt-2 border p-4 rounded">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="h-12" />
            ) : (
              <div className="text-gray-400">No logo yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <a className="btn-secondary" href="/onboarding/(wizard)/company">
          ← Back
        </a>
        <button onClick={onSave} className="btn-primary">
          Save & Continue
        </button>
      </div>
    </main>
  );
}
