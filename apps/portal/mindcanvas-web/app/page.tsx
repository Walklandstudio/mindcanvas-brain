'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome to <span className="text-blue-600">MindCanvas</span>
        </h1>
        <p className="text-gray-700 text-lg">
          Take the Competency Coach test, explore your personalized report, and manage results from your dashboard.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          <Link
            href="/test/competency-coach"
            className="rounded-xl bg-blue-600 text-white px-6 py-3 font-semibold shadow hover:bg-blue-700"
          >
            Start the Test
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-gray-100 px-6 py-3 font-semibold shadow hover:bg-gray-200"
          >
            View Dashboard
          </Link>
          <Link
            href="/admin/login"
            className="rounded-xl bg-gray-800 text-white px-6 py-3 font-semibold shadow hover:bg-black"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </main>
  );
}
