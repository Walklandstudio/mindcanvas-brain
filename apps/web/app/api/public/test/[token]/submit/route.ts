import { sbAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body =
  | { mode: 'totals'; totals: Record<string, number>; taker?: { first_name?: string; last_name?: string; email?: string } }
  | { mode: 'answers'; answers: Array<{ question_id: string; option_index: number; profile: string; points: number }>; taker?: { first_name?: string; last_name?: string; email?: string } };

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return json(400, { ok: false, error: 'missing_token' });

  const db = sbAdmin.schema('portal');

  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    // 1) lookup link->test
    const link = await db.from('test_links').select('test_id').eq('token', token).maybeSingle();
    if (link.error) return json(200, { ok: false, stage: 'link_lookup', error: link.error.message });
    if (!link.data)  return json(200, { ok: false, stage: 'link_lookup', error: 'link_not_found' });

    // 2) latest taker for this token
    const latest = await db
      .from('test_takers')
      .select('id')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) return json(200, { ok: false, stage: 'taker_lookup', error: latest.error.message });
    if (!latest.data)  return json(200, { ok: false, stage: 'taker_lookup', error: 'taker_not_found' });

    // 3) derive totals
    let totals: Record<string, number> = {};
    if ((body as any).mode === 'totals' && 'totals' in (body as any)) {
      totals = (body as any).totals || {};
    } else if ((body as any).mode === 'answers' && 'answers' in (body as any)) {
      for (const a of (body as any).answers || []) {
        if (!a?.profile || typeof a.points !== 'number') continue;
        totals[a.profile] = (totals[a.profile] || 0) + a.points;
      }
    } else {
      return json(200, { ok: false, stage: 'payload', error: 'invalid_payload' });
    }

    // 4) optional taker detail upsert (if you sent name/email)
    if ((body as any).taker) {
      await db.from('test_takers').update({
        first_name: (body as any).taker?.first_name ?? null,
        last_name:  (body as any).taker?.last_name  ?? null,
        email:      (body as any).taker?.email      ?? null,
      }).eq('id', latest.data.id);
    }

    // 5) insert submission
    const ins = await db.from('test_submissions').insert({
      taker_id: latest.data.id,
      test_id: link.data.test_id,
      link_token: token,
      totals,
      raw_answers: (body as any).answers ? (body as any).answers : null,
    }).select('id').single();
    if (ins.error) return json(200, { ok: false, stage: 'submission_insert', error: ins.error.message });

    // 6) mark completed
    await db.from('test_takers').update({ status: 'completed' }).eq('id', latest.data.id);

    return json(200, { ok: true, submission_id: ins.data.id });
  } catch (e: any) {
    return json(200, { ok: false, stage: 'catch', error: e?.message || 'internal_error' });
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
