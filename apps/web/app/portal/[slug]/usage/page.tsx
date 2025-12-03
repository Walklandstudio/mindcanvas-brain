// apps/web/app/portal/[slug]/usage/page.tsx
import { Suspense } from "react";
import PortalUsageClient from "./PortalUsageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function OrgUsagePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-300 p-4">Loading usage…</div>}>
      <PortalUsageClient />
    </Suspense>
  );
}
