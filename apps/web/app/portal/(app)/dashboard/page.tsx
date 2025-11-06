import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading…</div>}>
      <DashboardClient />
    </Suspense>
  );
}
