// apps/web/app/admin/framework/page.tsx
// Server page: loads 8 profiles and renders the client editor.

import { Suspense } from 'react';
import FrameworkEditor from './ui/FrameworkEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData() {
  // Use absolute origin so this also works in Vercel/edge.
  const origin = process.env.NEXT_PUBLIC_SITE_URL!;
  const res = await fetch(`${origin}/api/admin/framework`, {
    cache: 'no-store',
    // Forward cookies automatically not needed when using same origin,
    // but absolute URL is safer in server contexts.
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    // Let the error boundary show a clean message in production.
    throw new Error('Failed to load profiles');
  }
  return (await res.json()) as {
    profiles: { id: string; name: string; frequency: 'A' | 'B' | 'C' | 'D'; ordinal: number }[];
  };
}

export default async function Page() {
  const { profiles } = await getData();

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Framework — Profiles (8)</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Edit names, assign A–D, and ordering (1–8). These map test results → profile.
      </p>

      <Suspense fallback={<div className="mt-6 text-sm opacity-70">Loading…</div>}>
        <FrameworkEditor initialProfiles={profiles} />
      </Suspense>
    </main>
  );
}
