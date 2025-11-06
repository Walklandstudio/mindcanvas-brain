import { sbAdmin } from '@/lib/server/supabaseAdmin';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return json(200, { ok: false, stage: 'init', error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    const link = await db.from('test_links')
      .select('test_id')
      .eq('token', token)
      .maybeSingle();
    if (link.error) return json(200, { ok: false, stage: 'link_lookup', error: link.error.message });
    if (!link.data)  return json(200, { ok: false, stage: 'link_lookup', error: 'link_not_found' });

    const qs = await db.from('test_questions')
      .select('id, idx, "order", type, text, options, profile_map')
      .eq('test_id', link.data.test_id)
      .order('idx', { ascending: true });

    if (qs.error) return json(200, { ok: false, stage: 'questions', error: qs.error.message });

    return json(200, { ok: true, questions: qs.data ?? [] });
  } catch (e: any) {
    return json(200, { ok: false, stage: 'catch', error: e?.message || 'internal_error' });
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
