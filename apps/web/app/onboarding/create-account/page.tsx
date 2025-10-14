"use client";

import { useEffect, useState } from "react";
import { saveOnboarding } from "../_lib/save";

export default function CreateAccountStep() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const v = sessionStorage.getItem("onb_account_email") || "";
    if (v) setEmail(v);
  }, []);

  const onSave = async () => {
    await saveOnboarding({ account: { email } });
    sessionStorage.setItem("onb_account_email", email);
    document.dispatchEvent(new CustomEvent("onboarding:progress:recompute"));
    window.location.href = "/onboarding/company";
  };

  return (
    <main className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Create Account</h1>

      <div className="space-y-3">
        <label className="block text-sm text-gray-700">Work Email</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Step 1 of 4</span>
        <button onClick={onSave} className="btn-primary">Save & Continue</button>
      </div>
    </main>
  );
}
