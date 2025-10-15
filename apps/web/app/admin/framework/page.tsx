import { cookies } from 'next/headers';
import FrameworkClient from './FrameworkClient';

async function getOrgId() {
  const c = await cookies();
  return c.get('mc_org_id')?.value ?? '00000000-0000-0000-0000-000000000001';
}

export default async function FrameworkPage() {
  const orgId = await getOrgId();

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Framework</h1>
          <p className="text-white/60 text-sm">
            Edit names and images; then draft the 8 profile reports.
          </p>
        </div>
        <div className="flex gap-3">
          <form action="/api/admin/framework/generate" method="post">
            <button className="rounded-md bg-sky-600 px-4 py-2 text-white">Generate from Onboarding</button>
          </form>
          <a href="/admin/reports" className="rounded-md bg-white/10 px-4 py-2 border border-white/20">Go to Reports</a>
        </div>
      </div>

      {/* Client grid shows A–D columns; it will show “Preparing…” until rows exist */}
      <FrameworkClient />
    </main>
  );
}
