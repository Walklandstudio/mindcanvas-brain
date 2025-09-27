import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r bg-white">
          <div className="px-4 py-5">
            <div className="text-xl font-semibold">MindCanvas</div>
            <div className="mt-1 text-xs text-gray-500">Competency Coach</div>
          </div>
          <nav className="mt-4 space-y-1 px-2">
            <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100">Dashboard</Link>
            <Link href="/clients" className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100">Clients</Link>
            <Link href="/tests" className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100">Tests</Link>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <header className="flex items-center justify-between border-b bg-white px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold">Welcome</h1>
              <p className="text-sm text-gray-500">Your profile testing hub</p>
            </div>
            {/* User chip placeholder (hook to auth later) */}
            <div className="rounded-full border px-3 py-1 text-sm">Logged in: Admin</div>
          </header>
          <div className="px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
