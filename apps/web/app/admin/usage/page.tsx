// apps/web/app/admin/usage/page.tsx
import { Suspense } from "react";
import UsageClient from "./UsageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function UsagePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-300">Loading usage…</div>}>
      <UsageClient />
    </Suspense>
  );
}
