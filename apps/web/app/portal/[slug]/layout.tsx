export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import OrgSidebarClient from './OrgSidebarClient';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  // 👇 Don’t resolve org on the server. Let the client sidebar fetch it.
  return (
    <div className="min-h-screen flex mc-bg text-white">
      <aside className="w-64 p-5 border-r border-white/10">
        <OrgSidebarClient slug={params.slug} />
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
