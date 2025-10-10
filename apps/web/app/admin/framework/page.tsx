// apps/web/app/admin/framework/page.tsx
// Server page + client editor for 8 profiles
import { Suspense } from 'react';
import FrameworkEditor from './ui/FrameworkEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData() {
  const res = await fetch('/api/admin/framework', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load profiles');
  return (await res.json()) as { profiles: { id: string; name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number }[] };
}

export default async function Page() {
  const { profiles } = await getData();
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Framework — Profiles (8)</h1>
      <p className="text-sm text-gray-500 mt-1">Edit names, assign A–D, and ordering (1–8). These map test results → profile.</p>
      <Suspense fallback={<div className="mt-6">Loading…</div>}>
        <FrameworkEditor initialProfiles={profiles} />
      </Suspense>
    </main>
  );
}