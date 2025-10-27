export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import TestsClient from './TestsClient';

export default function Page({ params }: { params: { slug: string } }) {
  return <TestsClient slug={params.slug} />;
}
