import React, { Suspense } from "react";
import DashboardClient from "./DashboardClient";

// Server wrapper; all fetching happens in the client to avoid server param pitfalls.
export default function Page() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-sm opacity-60">Loading…</div>}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}
