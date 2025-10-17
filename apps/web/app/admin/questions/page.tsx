// apps/web/app/admin/questions/page.tsx
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { BASE_QUESTIONS, type QRow } from './seed';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function adminSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function findOrgAndFramework() {
  const sb = adminSb();

  const { data: org, error: eo } = await sb
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (eo) throw eo;
  if (!org) throw new Error('No organizations exist.');

  const { data: fw, error: ef } = await sb
    .from('org_frameworks')
    .select('id')
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (ef) throw ef;
  if (!fw) throw new Error('No framework exists for organization.');

  return { orgId: org.id as string, frameworkId: fw.id as string };
}

type ExistingRow = {
  question_no: number;
  prompt: string | null;
  options: { key: 'A' | 'B' | 'C' | 'D'; label: string }[] | null;
};

async function loadExisting(orgId: string, frameworkId: string) {
  const sb = adminSb();
  const { data, error } = await sb
    .from('org_questions')
    .select('question_no,prompt,options')
    .eq('org_id', orgId)
    .eq('framework_id', frameworkId)
    .order('question_no', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ExistingRow[];
}

export default async function Page() {
  const { orgId, frameworkId } = await findOrgAndFramework();
  const existing = await loadExisting(orgId, frameworkId);

  const rows: QRow[] = BASE_QUESTIONS.map((q) => {
    const match = existing?.find((e) => e.question_no === q.question_no);
    return match
      ? {
          question_no: q.question_no,
          prompt: match.prompt ?? q.prompt,
          options: (match.options ?? q.options) as QRow['options'],
        }
      : q;
  });

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Question Builder</h1>
      <p className="text-sm text-gray-600">
        Edit the wording shown to test-takers. Scoring weights are fixed to the master framework.
      </p>

      <form action="/admin/questions/save" method="post" className="space-y-8">
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="frameworkId" value={frameworkId} />

        {rows.map((q) => (
          <section key={q.question_no} className="rounded-md border p-4 space-y-3 bg-white">
            <h2 className="font-medium">Q{q.question_no}</h2>

            <label className="block text-xs font-medium text-gray-600">Prompt</label>
            <input
              name={`q${q.question_no}_prompt`}
              defaultValue={q.prompt}
              className="w-full border rounded px-3 py-2"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt) => (
                <div key={opt.key} className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Option {opt.key}
                  </label>
                  <input
                    name={`q${q.question_no}_${opt.key}`}
                    defaultValue={opt.label}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex gap-3">
          <button type="submit" className="px-4 py-2 bg-sky-700 text-white rounded">
            Save all
          </button>
          <a href="/dashboard" className="text-sky-700 underline text-sm">
            Back to dashboard
          </a>
        </div>
      </form>
    </main>
  );
}
