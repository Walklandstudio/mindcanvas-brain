import { Suspense } from 'react';
import PortalDashboardClient from '../portal/[slug]/dashboard/PortalDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;     // valid here (server file)
export const runtime = 'nodejs';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading…</div>}>
      <PortalDashboardClient />
    </Suspense>
  );
}
