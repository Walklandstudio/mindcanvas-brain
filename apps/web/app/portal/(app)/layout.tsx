import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r">
        <div className="px-4 py-6">
          <div className="text-xl font-semibold">MindCanvas</div>
          <div className="text-xs text-gray-500 mt-1">Client Portal</div>
        </div>
        <nav className="px-2 space-y-1">
          <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/portal">
            Dashboard
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/portal/database">
            Database
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/portal/tests">
            Tests
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
