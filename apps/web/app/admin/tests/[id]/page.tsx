// apps/web/app/admin/tests/[id]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '../../../_lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { id: string } }) {
  const sb = createClient();

  const { data: test, error: testErr } = await sb
    .from('org_tests')
    .select('id, name, mode, status, created_at')
    .eq('id', params.id)
    .single();

  if (testErr || !test) return notFound();

  const { data: questions } = await sb
    .from('test_questions')
    .select(`
      id, idx, stem, stem_rephrased,
      test_options (
        id, idx, label, label_rephrased, frequency, profile, points
      )
    `)
    .eq('test_id', test.id)
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
