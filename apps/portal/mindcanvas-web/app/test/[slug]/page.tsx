import TestClient from './TestClient';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sid?: string; name?: string; email?: string; phone?: string }>;
}) {
  const { slug } = await params;
  const { sid, name, email, phone } = await searchParams;

  return <TestClient slug={slug} sid={sid} prefill={{ name, email, phone }} />;
}
