"use client";

import { useEffect, useState } from "react";
import { saveOnboarding } from "../_lib/save";

export default function GoalsStep() {
  const [primaryGoal, setPrimaryGoal] = useState("");

  useEffect(() => {
    const v = sessionStorage.getItem("onb_goals_primary") || "";
    if (v) setPrimaryGoal(v);
  }, []);

  const onSave = async () => {
    await saveOnboarding({ goals: { primary: primaryGoal } });
    sessionStorage.setItem("onb_goals_primary", primaryGoal);
    document.dispatchEvent(new CustomEvent("onboarding:progress:recompute"));
    // After finishing onboarding, send them to Framework (Pass A flow)
    window.location.href = "/admin/framework";
  };

  return (
    <main className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Goals</h1>

      <div className="space-y-3">
        <label className="block text-sm text-gray-700">Primary Goal</label>
        <textarea
          className="w-full border rounded px-3 py-2 min-h-[120px]"
          value={primaryGoal}
          onChange={(e) => setPrimaryGoal(e.target.value)}
          placeholder="e.g., Launch a branded TEMA test for 50 pilot users and generate team insights."
        />
      </div>

      <div className="flex items-center justify-between">
        <a className="btn-secondary" href="/onboarding/branding">← Back</a>
        <button onClick={onSave} className="btn-primary">Finish Onboarding</button>
      </div>
    </main>
  );
}
