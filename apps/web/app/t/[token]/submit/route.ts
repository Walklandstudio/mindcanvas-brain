// apps/web/app/t/[token]/submit/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export const runtime = 'nodejs';

// simple in-memory throttle (per Vercel instance)
const WINDOW_MS = 60_000;
const LIMIT_PER_IP = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

function throttle(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (b.count >= LIMIT_PER_IP) return true;
  b.count += 1;
  return false;
}

export async function POST(req: Request) {
  // grab token from URL: /t/{token}/submit
  const { pathname } = new URL(req.url);
  const parts = pathname.split('/'); // ["", "t", "{token}", "submit"]
  const token = parts[2] || '';

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0';

  if (throttle(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  const sb = await getAdminClient();

  // 1) Load link
  const { data: link, error: linkErr } = await sb
    .from('test_links')
    .select('id, org_id, test_id, token, max_uses, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (linkErr || !link) {
    return NextResponse.json({ error: 'Invalid link.' }, { status: 400 });
  }

  // 2) Expiry check
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Link expired.' }, { status: 410 });
  }

  // 3) Uses check
  const usedRes = await sb
    .from('test_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', link.org_id)
    .eq('test_id', link.test_id)
    .eq('link_token', token);

  const usedCount = usedRes.count ?? 0;
  if (usedCount >= (link.max_uses ?? 1)) {
    return NextResponse.json({ error: 'Link already used.' }, { status: 409 });
  }

  // 4) Parse payload
  const body = await req.json().catch(() => ({}));
  const takerEmail = (body?.taker_email || '').trim();
  const takerName  = (body?.taker_name  || body?.name || '').trim();
  const totals     = body?.totals ?? {};
  const answers    = body?.answers ?? {};

  // 5) Optional taker upsert (no GHL)
  let takerId: string | null = null;
  if (takerEmail) {
    const upsert = await sb
      .from('test_takers')
      .upsert(
        [{ org_id: link.org_id, email: takerEmail, name: takerName || null }],
        { onConflict: 'org_id,email' }
      )
      .select('id')
      .maybeSingle();
    takerId = upsert.data?.id ?? null;
  }

  // 6) Insert submission
  const ins = await sb
    .from('test_submissions')
    .insert([{
      org_id: link.org_id,
      test_id: link.test_id,
      link_token: token,
      taker_id: takerId,
      taker_email: takerEmail || null,
      taker_name: takerName || null,
      total_points: totals?.points ?? null,
      frequency: totals?.frequency ?? null,
      profile: totals?.profile ?? null,
      answers
    }])
    .select('id')
    .maybeSingle();

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  // 7) Store canonical result URL on the test taker (if we have one)
  if (takerId) {
    const resultUrl = `/t/${encodeURIComponent(
      token
    )}/result?tid=${encodeURIComponent(takerId)}`;

    await sb
      .from('test_takers')
      .update({ last_result_url: resultUrl })
      .eq('id', takerId);
  }

  return NextResponse.json({ ok: true, submissionId: ins.data?.id ?? null });
}

