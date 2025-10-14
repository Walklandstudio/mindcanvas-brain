"use client";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <nav className="container mx-auto flex items-center gap-6 py-3">
        <a className="font-semibold" href="/">
          MindCanvas
        </a>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          {/* “Demo” points to Framework for Pass A demo path */}
          <a href="/admin/framework">Demo</a>
          <a href="/admin/test-builder">Test Builder</a>
          {/* Compatibility removed for Pass A */}
          <a href="/admin/reports">Reports</a>
        </div>
      </nav>
    </header>
  );
}
