// apps/web/app/tests/page.tsx
export default function TestsIndex() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Tests</h1>
      <p className="text-sm text-gray-500 mt-1">Create and manage your organization’s tests.</p>
      <div className="mt-6 flex gap-3">
        <a
          href="/tests/new?mode=free"
          className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800"
        >
          Create Free Test
        </a>
        <a
          href="/tests/new?mode=full"
          className="px-4 py-2 rounded-xl border hover:bg-gray-50"
        >
          Create Full Test
        </a>
      </div>
      <div className="mt-10 text-sm text-gray-500 italic">
        (Test list and analytics coming soon)
      </div>
    </main>
  );
}