// apps/web/app/portal/[slug]/dashboard/page.tsx
import { Suspense } from "react";
import PortalDashboardClient from "./PortalDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading…</div>}>
      <PortalDashboardClient orgSlug={params.slug} />
    </Suspense>
  );
}

