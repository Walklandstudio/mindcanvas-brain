// apps/web/app/api/portal/invites/create/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';
import { Resend } from 'resend';   // remove this line if you’re not using email yet

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function makeToken(prefix = 'tp') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { testKey, email, kind = 'full', maxUses = 1 } = body || {};

  if (!testKey || !email) {
    return NextResponse.json({ error: 'Missing testKey or email' }, { status: 400 });
  }

  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 });

  // Find the test by id or slug
  const byId = await sb.from('org_tests').select('id').eq('org_id', orgId).eq('id', testKey).maybeSingle();
  let testId: string | null = byId.data?.id ?? null;

  if (!testId) {
    const bySlug = await sb.from('org_tests').select('id').eq('org_id', orgId).eq('slug', testKey).maybeSingle();
    testId = bySlug.data?.id ?? null;
  }

  if (!testId) {
    return NextResponse.json({ error: 'Test not found in org' }, { status: 404 });
  }

  // Create a token + link record
  const token = makeToken('tp');
  const ins = await sb.from('test_links')
    .insert([{ org_id: orgId, test_id: testId, token, max_uses: maxUses, kind }])
    .select('token')
    .maybeSingle();

  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  const appOrigin = (process.env.APP_ORIGIN || '').replace(/\/+$/,'');
  const url = `${appOrigin}/t/${token}`;

  // Send email if key exists
  if (resend) {
    await resend.emails.send({
      from: 'invites@mindcanvas.ai', // use your verified sender
      to: email,
      subject: 'Your profile test link',
      html: `<p>Hi,</p><p>Please take your profile test here:</p><p><a href="${url}">${url}</a></p>`,
    });
  }

  // Always return the link URL
  return NextResponse.json({ url }, { status: 201 });
}
