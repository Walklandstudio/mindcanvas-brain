import Link from 'next/link';
import ClientBuilder from './ClientBuilder';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TestBuilderPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Test Builder</h1>
          <p className="text-sm text-white/70">
            Edit questions, scoring, and preview the test.
          </p>
        </div>
        <Link
          href="/tests"
          className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
        >
          Back to Tests
        </Link>
      </div>

      <div className="mc-card">
        <ClientBuilder testId={id} />
      </div>
    </div>
  );
}
