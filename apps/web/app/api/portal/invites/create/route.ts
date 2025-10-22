import { NextResponse } from 'next/server';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

export const runtime = 'nodejs';

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const { Resend } = await import('resend'); // dynamic import
    return new Resend(process.env.RESEND_API_KEY);
  } catch {
    return null;
  }
}

function makeToken(prefix = 'tp') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { testKey, email, kind = 'full', maxUses = 1 } = body || {};
  if (!testKey || !email) return NextResponse.json({ error: 'Missing testKey or email' }, { status: 400 });

  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 });

  const byId = await sb.from('org_tests').select('id').eq('org_id', orgId).eq('id', testKey).maybeSingle();
  let testId: string | null = byId.data?.id ?? null;
  if (!testId) {
    const bySlug = await sb.from('org_tests').select('id').eq('org_id', orgId).eq('slug', testKey).maybeSingle();
    testId = bySlug.data?.id ?? null;
  }
  if (!testId) return NextResponse.json({ error: 'Test not found in org' }, { status: 404 });

  const token = makeToken('tp');
  const ins = await sb.from('test_links')
    .insert([{ org_id: orgId, test_id: testId, token, max_uses: maxUses, kind }])
    .select('token')
    .maybeSingle();
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  const appOrigin = (process.env.APP_ORIGIN || '').replace(/\/+$/, '');
  const url = `${appOrigin}/t/${token}`;

  const resend = await getResend();
  if (resend) {
    await resend.emails.send({
      from: 'invites@mindcanvas.ai', // use a verified sender if you’ve set up a domain in Resend
      to: email,
      subject: 'Your profile test link',
      html: `<p>Hi,</p><p>Please take your profile test here:</p><p><a href="${url}">${url}</a></p>`,
    });
  }

  return NextResponse.json({ url }, { status: 201 });
}
