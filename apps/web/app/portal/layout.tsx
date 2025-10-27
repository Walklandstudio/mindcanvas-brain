export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r p-6">
        <div className="text-2xl font-bold">Client Portal</div>
        <div className="text-slate-500">MindCanvas</div>
        <nav className="mt-8 space-y-3">
          <a href="/portal/admin" className="block">Admin</a>
          {/* the left-side links inside an org come from that org's pages */}
        </nav>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
