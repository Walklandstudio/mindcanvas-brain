'use server';

import { createClient } from '../../_lib/supabase/server';
import { orgIdFromAuth } from '../../_lib/org';
import { TEMPLATE } from './templates';

export async function createTestAction(params: { name: string; mode: 'free' | 'full' }) {
  const { name, mode } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not signed in');

  const { data, error } = await sb
    .from('org_tests')
    .insert({ org_id: orgId, name, mode, created_by: userId })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function importTemplateAction(params: { testId: string }) {
  const { testId } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  // find current max idx
  const { data: existing } = await sb
    .from('test_questions')
    .select('idx')
    .eq('test_id', testId)
    .order('idx', { ascending: false })
    .limit(1);

  let idxOffset = existing?.[0]?.idx ?? 0;

  for (const q of TEMPLATE) {
    idxOffset += 1;
    const { data: insQ, error: qErr } = await sb
      .from('test_questions')
      .insert({
        org_id: orgId,
        test_id: testId,
        idx: idxOffset,
        stem: q.stem,
        stem_rephrased: null,
      })
      .select('id')
      .single();
    if (qErr) throw new Error(qErr.message);

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
    }));

    const { error: oErr } = await sb.from('test_options').insert(rows);
    if (oErr) throw new Error(oErr.message);
  }

  return { ok: true };
}
