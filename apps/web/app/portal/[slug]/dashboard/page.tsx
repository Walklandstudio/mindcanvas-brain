// apps/web/app/portal/[slug]/dashboard/page.tsx
import React, { Suspense } from "react";
import DashboardClient from "./DashboardClient";
import UsageSection from "./UsageSection";

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
      </header>

      <Suspense fallback={<div className="text-sm opacity-70 text-white/70">Loading…</div>}>
        <DashboardClient />
      </Suspense>

      {/* Usage & Segmentation for this org */}
      <Suspense fallback={<div className="text-sm opacity-70 text-white/70">Loading usage…</div>}>
        <UsageSection />
      </Suspense>
    </div>
  );
}


