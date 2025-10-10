// apps/web/app/tests/new/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import NewTestClient from './ui/NewTestClient';

export default function Page({ searchParams }: { searchParams?: { mode?: string } }) {
  const modeParam = searchParams?.mode;
  const initialMode = modeParam === 'free' || modeParam === 'full' ? modeParam : 'full';
  return <NewTestClient initialMode={initialMode} />;
}
