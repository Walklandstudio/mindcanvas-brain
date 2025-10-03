import TestClient from './TestClient';

type Params = { slug: string };
type Search = { sid?: string; name?: string; email?: string; phone?: string };

export default async function Page(props: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await props.params;
  const { sid, name, email, phone } = await props.searchParams;

  return <TestClient slug={slug} sid={sid} prefill={{ name, email, phone }} />;
}
