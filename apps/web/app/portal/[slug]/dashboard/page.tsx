import { Suspense } from "react";
import PortalDashboardClient from "./PortalDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-dvh mc-bg text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Suspense
          fallback={
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-slate-200">
              Loading…
            </div>
          }
        >
          <PortalDashboardClient orgSlug={params.slug} />
        </Suspense>
      </div>
    </div>
  );
}


