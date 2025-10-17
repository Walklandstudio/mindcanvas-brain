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

/** Import the 15 base Qs (idempotent per test execution) */
export async function importTemplateAction({ testId }: { testId: string }) {
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const { data: existing } = await sb
    .from('test_questions')
    .select('idx')
    .eq('test_id', testId)
    .order('idx', { ascending: false })
    .limit(1);

  let idx = existing?.[0]?.idx ?? 0;

  for (const q of TEMPLATE) {
    idx += 1;
    const { data: insQ, error: qErr } = await sb
      .from('test_questions')
      .insert({
        org_id: orgId,
        test_id: testId,
        idx,
        stem: q.stem,
        stem_rephrased: null,
        kind: q.kind ?? 'base',
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
      affects_scoring: (q.kind ?? 'base') === 'base',
    }));
    const { error: oErr } = await sb.from('test_options').insert(rows);
    if (oErr) throw new Error(oErr.message);
  }
  return { ok: true };
}

/** Add a single segmentation question (does not affect scoring) */
export async function addSegmentationQuestionAction(params: {
  testId: string;
  stem: string;
  options: string[]; // labels only
}) {
  const { testId, stem, options } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const { data: last } = await sb
    .from('test_questions')
    .select('idx')
    .eq('test_id', testId)
    .order('idx', { ascending: false })
    .limit(1);
  const idx = (last?.[0]?.idx ?? 0) + 1;

  const { data: insQ, error: qErr } = await sb
    .from('test_questions')
    .insert({ org_id: orgId, test_id: testId, idx, stem, kind: 'segment' })
    .select('id')
    .single();
  if (qErr) throw new Error(qErr.message);

  const qid = insQ!.id as string;
  const rows = options.map((label, i) => ({
    org_id: orgId,
    question_id: qid,
    idx: i + 1,
    label,
    label_rephrased: null,
    frequency: '-',
    profile: '-',
    points: 0,
    affects_scoring: false,
  }));
  const { error: oErr } = await sb.from('test_options').insert(rows);
  if (oErr) throw new Error(oErr.message);
  return { ok: true };
}

/** Bring back "Create public URL + iframe" feature */
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

/** Rephrase a question stem with brand voice (stub AI call; persists) */
export async function rephraseQuestionAction(params: {
  questionId: string;
  currentText: string;
  brandVoice: string;
}) {
  const { questionId, currentText, brandVoice } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const [{ data: brand }] = await Promise.all([
    sb.from('org_brand_settings').select('brand_voice').eq('org_id', orgId).maybeSingle(),
  ]);

  // TODO: plug real AI; use brand?.brand_voice || brandVoice as guidance
  const rephrased = currentText;

  const { error } = await sb
    .from('test_questions')
    .update({ stem_rephrased: rephrased })
    .eq('id', questionId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
  return { ok: true, text: rephrased };
}

/** Rephrase an option label with brand voice (stub AI call; persists) */
export async function rephraseOptionAction(params: {
  optionId: string;
  currentText: string;
  brandVoice: string;
}) {
  const { optionId, currentText, brandVoice } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const [{ data: brand }] = await Promise.all([
    sb.from('org_brand_settings').select('brand_voice').eq('org_id', orgId).maybeSingle(),
  ]);

  // TODO: plug real AI; use brand?.brand_voice || brandVoice
  const rephrased = currentText;

  const { error } = await sb
    .from('test_options')
    .update({ label_rephrased: rephrased })
    .eq('id', optionId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
  return { ok: true, text: rephrased };
}
