// apps/web/app/t/[token]/page.tsx
import PublicTestClient from './PublicTestClient';

// Force server to never cache; keep it simple
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page({ params }: { params: { token: string } }) {
  // Do not fetch, do not read cookies, do not touch env here.
  return <PublicTestClient token={params.token} />;
}
