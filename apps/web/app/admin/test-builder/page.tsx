// apps/web/app/admin/test-builder/page.tsx
import { createClient } from '../../_lib/supabase/server';
import { orgIdFromAuth } from '../../_lib/org';
import TopBar from './ui/TopBar';
import Client from './ui/Client';
import { EnsureOrgButton } from './ui/controls/EnsureOrgButton';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ test?: string }>;
}) {
  const sb = createClient();
  const orgId = await orgIdFromAuth();

  const params = (await searchParams) ?? {};

  if (!orgId) {
    // No org after deploy / fresh login — show one-click bootstrap
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Test Builder</h1>
        <p className="text-gray-600">
          No organization found for your account. Click below to create a demo
          org and continue.
        </p>
        <EnsureOrgButton />
      </main>
    );
  }

  const { data: tests } = await sb
    .from('org_tests')
    .select('id,name,mode,status,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  const activeId = params.test ?? tests?.[0]?.id ?? null;

  let active = null as
    | (NonNullable<typeof tests>[number] & {
        test_questions: Array<{
          id: string;
          idx: number;
          stem: string;
          stem_rephrased: string | null;
          test_options: Array<{
            id: string;
            idx: number;
            label: string;
            label_rephrased: string | null;
            frequency: string;
            profile: string;
            points: number;
          }>;
        }>;
      })
    | null;

  if (activeId) {
    const { data } = await sb
      .from('org_tests')
      .select(
        `
        id,name,mode,status,created_at,
        test_questions (
          id, idx, stem, stem_rephrased,
          test_options ( id, idx, label, label_rephrased, frequency, profile, points )
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
