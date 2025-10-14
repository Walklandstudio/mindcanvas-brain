"use client";

import { useEffect, useState } from "react";

/**
 * Demo-only progress bar:
 * Heuristic: 4 sections → +25% each if a sessionStorage key is present.
 * Replace this with a real fetch from org_onboarding if available.
 */
export default function Progress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const compute = () => {
      const flags = [
        !!sessionStorage.getItem("onb_account_email"),
        !!sessionStorage.getItem("onb_company_name"),
        !!sessionStorage.getItem("onb_branding_logoUrl"),
        !!sessionStorage.getItem("onb_goals_primary"),
      ];
      setPct(flags.reduce((a, b) => a + (b ? 25 : 0), 0));
    };
    compute();

    const handler = () => compute();
    document.addEventListener("onboarding:progress:recompute", handler as any);
    return () =>
      document.removeEventListener("onboarding:progress:recompute", handler as any);
  }, []);

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-100 rounded">
        <div
          className="h-2 bg-indigo-600 rounded"
          style={{ width: `${pct}%`, transition: "width 200ms ease" }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-600">{pct}%</div>
    </div>
  );
}
