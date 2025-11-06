import 'server-only';
import { Suspense } from 'react';
import DashboardClient from './ui/DashboardClient';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PortalDashboardPage() {
  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-semibold">Dashboard (preview)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Pass <code>?org=&lt;slug&gt;</code> and optionally <code>&amp;testId=&lt;uuid&gt;</code>.
      </p>
      <Suspense fallback={<div className="text-sm opacity-70">Loading dashboard…</div>}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}
