import TestClient from './TestClient';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sid?: string }>;
}) {
  const { slug } = await params;
  const { sid } = await searchParams;
  return <TestClient slug={slug} sid={sid} />;
}
