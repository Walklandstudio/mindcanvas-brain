// apps/web/app/tests/new/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import NewTestClient from './ui/NewTestClient';

export default function Page(props: any) {
  const modeParam = props?.searchParams?.mode;
  const initialMode = modeParam === 'free' || modeParam === 'full' ? modeParam : 'full';
  return <NewTestClient initialMode={initialMode} />;
}
