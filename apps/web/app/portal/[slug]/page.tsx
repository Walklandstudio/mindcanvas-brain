// apps/web/app/portal/[slug]/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { resolveOrgBySlug } from '@/lib/resolveOrg';

export default async function Page({ params }: { params: { slug: string } }) {
  const org = await resolveOrgBySlug(params.slug);
  if (!org) return null;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-white/70">Welcome <b>{org.name}</b>. Use the sidebar to navigate.</p>
    </div>
  );
}
