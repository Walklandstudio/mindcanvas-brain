// app/page.tsx

// Render at request time to avoid any prerender crashes.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">OK — Index (no prerender)</h1>

      <p className="mt-2 text-gray-600">
        This page skips static generation to avoid the build-time error.
      </p>

      <ul className="list-disc pl-6 mt-4 space-y-1">
        <li>
          <Link className="underline" href="/">Home</Link>
        </li>
        <li>
          <Link className="underline" href="/health">Health</Link>
        </li>
        <li>
          <Link className="underline" href="/test/demo">/test/demo</Link>
        </li>
      </ul>
    </main>
  );
}
