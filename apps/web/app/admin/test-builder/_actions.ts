'use server';

import { createClient } from '../../_lib/supabase/server';
import { orgIdFromAuth } from '../../_lib/org';

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

export async function rephraseQuestionAction(params: {
  questionId: string;
  currentText: string;
  brandVoice: string;
}) {
  const { questionId, currentText } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  // TODO: replace with your AI call; keep mapping intact
  const rephrased = currentText;

  const { error } = await sb
    .from('test_questions')
    .update({ stem_rephrased: rephrased })
    .eq('id', questionId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
  return { ok: true, text: rephrased };
}

export async function rephraseOptionAction(params: {
  optionId: string;
  currentText: string;
  brandVoice: string;
}) {
  const { optionId, currentText } = params;
  const sb = createClient();
  const orgId = await orgIdFromAuth();
  if (!orgId) throw new Error('No organization for current user');

  const rephrased = currentText;

  const { error } = await sb
    .from('test_options')
    .update({ label_rephrased: rephrased })
    .eq('id', optionId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
  return { ok: true, text: rephrased };
}
