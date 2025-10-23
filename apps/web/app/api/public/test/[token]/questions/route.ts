// apps/web/app/api/public/test/[token]/questions/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: any) {
  try {
    const token = context?.params?.token as string | undefined;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const sb = await getAdminClient();

    // resolve link -> test_id
    const { data: link, error: linkErr } = await sb
      .from('test_links')
      .select('test_id, expires_at, max_uses, uses')
      .eq('token', token)
      .maybeSingle();

    if (linkErr || !link) return NextResponse.json({ error: 'invalid or expired link' }, { status: 404 });
    if (!link.test_id) return NextResponse.json({ error: 'Link has no test_id' }, { status: 400 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }
    if (link.max_uses != null && (link.uses ?? 0) >= link.max_uses) {
      return NextResponse.json({ error: 'Link already used' }, { status: 409 });
    }

    // questions (ordered) + options (ordered)
    const { data: questions, error: qErr } = await sb
      .from('test_questions')
      .select('id, order, type, text')
      .eq('test_id', link.test_id)
      .order('order', { ascending: true });

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    // fetch all options for these questions
    const qids = (questions ?? []).map(q => q.id);
    let optionsByQ: Record<string, any[]> = {};
    if (qids.length > 0) {
      const { data: options, error: oErr } = await sb
        .from('test_options')
        .select('id, question_id, idx, label, frequency, profile, points, code')
        .in('question_id', qids)
        .order('idx', { ascending: true });

      if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

      for (const opt of options ?? []) {
        const arr = optionsByQ[opt.question_id] || (optionsByQ[opt.question_id] = []);
        arr.push(opt);
      }
    }

    const payload = (questions ?? []).map(q => ({
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      options: optionsByQ[q.id] ?? [],
    }));

    return NextResponse.json({ ok: true, questions: payload });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
