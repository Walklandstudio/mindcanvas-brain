'use server';

import { createClient } from '../../_lib/supabase/server';
import { orgIdFromAuth, ensureOrg } from '../../_lib/org';
import { TEMPLATE } from './templates';

/** Create a test (free/full) and return its id */
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

/** One-click bootstrap org (used by EnsureOrgButton) */
export async function ensureOrgAction({ name }: { name: string }) {
  await ensureOrg(name);
  return { ok: true };
}

/** Import our default question template into an existing test */
export async function importTemplateAction(params: { testId: string }) {
  const { testId } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

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

/** Bring back your "Create public URL + iframe" feature */
export async function createPublicLinkAction(params: { testId: string }) {
  const { testId } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const { data, error } = await sb
    .from('test_takers')
    .insert({
      org_id: orgId,
      test_id: testId,
      email: `public+${crypto.randomUUID()}@example.com`,
      name: 'Public Link',
    })
    .select('token')
    .single();

  if (error) throw new Error(error.message);
  const token = data!.token as string;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://mindcanvas-staging.vercel.app';
  const url = `${base}/t/${token}`;
  const iframe = `<iframe src="${base}/t/${token}/embed" width="100%" height="800" frameborder="0" allowfullscreen></iframe>`;
  return { url, iframe };
}

/** Rephrase question */
export async function rephraseQuestionAction(params: {
  questionId: string;
  currentText: string;
  brandVoice: string;
}) {
  const { questionId, currentText } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const rephrased = currentText; // TODO plug AI
  const { error } = await sb
    .from('test_questions')
    .update({ stem_rephrased: rephrased })
    .eq('id', questionId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
  return { ok: true, text: rephrased };
}

/** Rephrase option */
export async function rephraseOptionAction(params: {
  optionId: string;
  currentText: string;
  brandVoice: string;
}) {
  const { optionId, currentText } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const rephrased = currentText; // TODO plug AI
  const { error } = await sb
    .from('test_options')
    .update({ label_rephrased: rephrased })
    .eq('id', optionId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
  return { ok: true, text: rephrased };
}
