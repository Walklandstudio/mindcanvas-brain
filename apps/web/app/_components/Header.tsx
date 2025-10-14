// apps/web/app/_components/Header.tsx
"use client";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <nav className="container mx-auto flex items-center gap-6 py-3">
        <a className="font-semibold" href="/">MindCanvas</a>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <a href="/admin/framework">Framework</a>
          <a href="/admin/test-builder">Test Builder</a>
          <a href="/admin/reports">Reports</a>
          {/* Compatibility removed */}
        </div>
      </nav>
    </header>
  );
}
