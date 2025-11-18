import React, { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function Page() {
  return (
    <div className="space-y-6">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
      </header>
      <Suspense fallback={<div className="text-sm opacity-70 text-white/70">Loading…</div>}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}

