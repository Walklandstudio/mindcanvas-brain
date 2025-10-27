export const dynamic = "force-dynamic";

export default function PortalLayout({
  params,
  children,
}: {
  params: { slug: string };
  children: React.ReactNode;
}) {
  const { slug } = params;

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="border-r bg-white p-6">
        <div className="text-lg font-semibold mb-6">Client Portal</div>
        <nav className="space-y-3 text-sm">
          <a className="block hover:underline" href={`/portal/${slug}`}>Dashboard</a>
          <a className="block hover:underline" href={`/portal/${slug}/database`}>Database</a>
          <a className="block hover:underline" href={`/portal/${slug}/tests`}>Tests</a>
        </nav>
      </aside>

      {/* Main */}
      <main className="bg-slate-50 p-6">{children}</main>
    </div>
  );
}
