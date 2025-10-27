export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import PublicTestClient from './PublicTestClient';

export default function Page({ params }: { params: { token: string } }) {
  return <PublicTestClient token={params.token} />;
}
