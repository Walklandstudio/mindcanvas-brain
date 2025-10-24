import React from "react";
import Link from "next/link";

export default function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const { slug } = params;
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-64 bg-white text-slate-900 border-r">
        <div className="px-4 py-6">
          <div className="text-xl font-semibold">Client Portal</div>
          <div className="text-xs text-slate-500 mt-1">MindCanvas</div>
        </div>
        <nav className="px-2 space-y-1">
          <Link className="block px-3 py-2 rounded hover:bg-slate-100" href={`/portal/${slug}`}>
            Dashboard
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-100" href={`/portal/${slug}/database`}>
            Database
          </Link>
          <Link className="block px-3 py-2 rounded hover:bg-slate-100" href={`/portal/${slug}/tests`}>
            Tests
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
