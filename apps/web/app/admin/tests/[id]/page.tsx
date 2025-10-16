// apps/web/app/admin/tests/[id]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '../../../_lib/supabase/server';

export const dynamic = 'force-dynamic';

// In Next.js 15 typed routes, params is a Promise—await it.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sb = createClient();

  const { data: test, error: testErr } = await sb
    .from('org_tests')
    .select('id, name, mode, status, created_at')
    .eq('id', id)
    .single();

  if (testErr || !test) return notFound();

  const { data: questions } = await sb
    .from('test_questions')
    .select(`
      id, idx, stem, stem_rephrased,
      test_options ( id, idx, label, label_rephrased, frequency, profile, points )
    `)
    .eq('test_id', id)
    .order('idx');

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        {test.name} <span className="text-gray-500">({test.mode})</span>
      </h1>

      <section className="rounded-2xl border p-4 bg-white">
        <h2 className="font-semibold mb-2">Questions</h2>
        <pre className="rounded bg-neutral-900 text-neutral-100 p-4 overflow-auto">
          {JSON.stringify(questions ?? [], null, 2)}
        </pre>
      </section>
    </main>
  );
}
