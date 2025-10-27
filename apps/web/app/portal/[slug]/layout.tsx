// apps/web/app/portal/[slug]/layout.tsx
import Link from 'next/link';
import { resolveOrgBySlug } from '@/lib/resolveOrg';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const org = await resolveOrgBySlug(params.slug);

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg p-6 border rounded-2xl bg-white/5 text-white/90">
          <div className="text-xl font-semibold mb-2">Organization not found</div>
          <p className="text-white/70 mb-4">
            We couldn’t resolve the organization for slug <code>{params.slug}</code>.
          </p>
          <Link className="underline" href="/">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex mc-bg text-white">
      <aside className="w-64 p-5 border-r border-white/10">
        <div className="mb-6">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-10" />
          ) : (
            <div className="font-semibold text-lg">{org.name}</div>
          )}
          <div className="text-white/60 text-sm">Welcome, {org.name}</div>
        </div>

        <nav className="space-y-2">
          <Link href={`/portal/${org.slug}`} className="block px-3 py-2 rounded hover:bg-white/10">
            Dashboard
          </Link>
          <Link href={`/portal/${org.slug}/database`} className="block px-3 py-2 rounded hover:bg-white/10">
            Database
          </Link>
          <Link href={`/portal/${org.slug}/tests`} className="block px-3 py-2 rounded hover:bg-white/10">
            Tests
          </Link>
          <Link href={`/portal/${org.slug}/profile`} className="block px-3 py-2 rounded hover:bg-white/10">
            Profile
          </Link>
          <Link href={`/portal/${org.slug}/settings`} className="block px-3 py-2 rounded hover:bg-white/10">
            Settings
          </Link>
        </nav>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}
