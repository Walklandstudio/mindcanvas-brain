export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ❌ Do NOT import or use `PageProps`
// import type { PageProps } from 'next'  // <- remove if present

export default async function Page(
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // ... your existing logic ...
  return (
    <main className="mx-auto w-[850px] p-8">
      {/* existing report UI */}
    </main>
  );
}
