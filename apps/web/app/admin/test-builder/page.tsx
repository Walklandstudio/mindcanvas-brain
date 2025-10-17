// apps/web/app/admin/test-builder/page.tsx
import { redirect } from 'next/navigation';
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

  // Server-side auth check (no client flicker)
  const { data: userRes } = await sb.auth.getUser();
  if (!userRes?.user) {
    redirect('/onboarding?next=%2Fadmin%2Ftest-builder');
  }

  // Ensure org
  let orgId = await orgIdFromAuth();
  if (!orgId) {
    orgId = await ensureOrg('Demo Org');
  }

  const params = (await searchParams) ?? {};

  // Ensure at least one test
  const { data: tests0 } = await sb
    .from('org_tests')
    .select('id,name,mode,status,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  let tests = tests0 ?? [];
  if (tests.length === 0) {
    const { data: created } = await sb
      .from('org_tests')
      .insert({
        org_id: orgId,
        name: 'Base Assessment',
        mode: 'full',
        status: 'active',
        created_by: userRes.user.id,
      })
      .select('id,name,mode,status,created_at')
      .single();

    if (created) tests = [created];
  }

  const activeId = params.test ?? tests?.[0]?.id ?? null;

  // Seed 15 base questions once
  if (activeId) {
    const { count } = await sb
      .from('test_questions')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', activeId);

    if (!count || count === 0) {
      let idx = 0;
      for (const q of TEMPLATE) {
        idx += 1;
        const { data: insQ } = await sb
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
        await sb.from('test_options').insert(rows);
      }
    }
  }

  // Load for render
  let active: any = null;
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
    active = data ?? null;
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Test Builder</h1>
      <TopBar tests={tests ?? []} activeId={activeId} />
      <Client tests={tests ?? []} active={active} />
    </main>
  );
}
