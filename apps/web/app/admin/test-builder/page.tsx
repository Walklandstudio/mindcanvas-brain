// apps/web/app/admin/test-builder/page.tsx
import { createClient } from '../../_lib/supabase/server';
import { orgIdFromAuth, ensureOrg } from '../../_lib/org';
import TopBar from './ui/TopBar';
import Client from './ui/Client';
import { TEMPLATE } from './templates';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ test?: string }>;
}) {
  const sb = createClient();

  // 1) Ensure org exists (auto-create if missing)
  let orgId = await orgIdFromAuth();
  if (!orgId) {
    orgId = await ensureOrg('Demo Org');
  }

  const params = (await searchParams) ?? {};

  // 2) Ensure at least one test exists
  const { data: tests0, error: tErr0 } = await sb
    .from('org_tests')
    .select('id,name,mode,status,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (tErr0) {
    console.error('load tests error', tErr0);
  }

  let tests = tests0 ?? [];
  if (tests.length === 0) {
    // create a default test
    const { data: userRes } = await sb.auth.getUser();
    const userId = userRes.user?.id ?? null;

    const { data: created, error: cErr } = await sb
      .from('org_tests')
      .insert({
        org_id: orgId,
        name: 'Base Assessment',
        mode: 'full',
        status: 'active',
        created_by: userId,
      })
      .select('id,name,mode,status,created_at')
      .single();

    if (cErr) {
      console.error('create default test error', cErr);
    } else if (created) {
      tests = [created];
    }
  }

  const activeId = params.test ?? tests?.[0]?.id ?? null;

  // 3) Ensure active test has the 15 base questions (first time only)
  if (activeId) {
    // count existing
    const { data: countQs } = await sb
      .from('test_questions')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', activeId);

    const existingCount = countQs ? (countQs as unknown as { count: number }).count : 0;

    if (!existingCount || existingCount === 0) {
      // seed template
      let idx = 0;
      for (const q of TEMPLATE) {
        idx += 1;
        const { data: insQ, error: qErr } = await sb
          .from('test_questions')
          .insert({
            org_id: orgId,
            test_id: activeId,
            idx,
            stem: q.stem,
            stem_rephrased: null,
            kind: q.kind ?? 'base',
          })
          .select('id')
          .single();
        if (qErr) {
          console.error('seed question error', qErr);
          continue;
        }
        const qid = insQ!.id as string;
        const rows = q.options.map((o, i) => ({
          org_id: orgId,
          question_id: qid,
          idx: i + 1,
          label: o.label,
          label_rephrased: null,
          frequency: o.frequency,
          profile: o.profile,
          points: o.points,
          affects_scoring: (q.kind ?? 'base') === 'base',
        }));
        const { error: oErr } = await sb.from('test_options').insert(rows);
        if (oErr) console.error('seed options error', oErr);
      }
    }
  }

  // 4) Load active test with questions/options for rendering
  let active:
    | {
        id: string;
        name: string;
        mode: string;
        status: string;
        created_at: string;
        test_questions: Array<{
          id: string;
          idx: number;
          stem: string;
          stem_rephrased: string | null;
          kind: 'base' | 'segment';
          test_options: Array<{
            id: string;
            idx: number;
            label: string;
            label_rephrased: string | null;
            frequency: string;
            profile: string;
            points: number;
            affects_scoring?: boolean;
          }>;
        }>;
      }
    | null = null;

  if (activeId) {
    const { data } = await sb
      .from('org_tests')
      .select(
        `
        id,name,mode,status,created_at,
        test_questions (
          id, idx, stem, stem_rephrased, kind,
          test_options ( id, idx, label, label_rephrased, frequency, profile, points, affects_scoring )
        )
      `
      )
      .eq('id', activeId)
      .single();
    active = (data ?? null) as typeof active;
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Test Builder</h1>
      <TopBar tests={tests ?? []} activeId={activeId} />
      <Client tests={tests ?? []} active={active} />
    </main>
  );
}
