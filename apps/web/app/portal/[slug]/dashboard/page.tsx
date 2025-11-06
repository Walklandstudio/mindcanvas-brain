import "server-only";
import { Suspense } from "react";
import DashboardClient from "../dashboard/DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page(props: { params: { slug: string } }) {
  const orgSlug = props.params.slug; // e.g., team-puzzle
  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold">Dashboard (preview)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Organisation: <code>{orgSlug}</code>
      </p>
      <Suspense fallback={<div className="text-sm opacity-70">Loading dashboard…</div>}>
        <DashboardClient orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
