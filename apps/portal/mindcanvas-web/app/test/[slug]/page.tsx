// app/test/[slug]/page.tsx
type Params = { slug: string };

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Test: {slug}</h1>
    </main>
  );
}

// ✅ Do not export GET/POST/etc. from a page file.



