export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import TestDetailsClient from './TestDetailsClient';

export default function Page({
  params,
}: {
  params: { slug: string; testId: string };
}) {
  return <TestDetailsClient slug={params.slug} testId={params.testId} />;
}
