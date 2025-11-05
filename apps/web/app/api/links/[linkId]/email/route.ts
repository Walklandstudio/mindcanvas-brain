import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const revalidate = 0;

const resendKey = process.env.RESEND_API_KEY || '';
const resend = resendKey ? new Resend(resendKey) : null;

function baseUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!url) throw new Error('Missing NEXT_PUBLIC_SITE_URL');
  return url.replace(/\/$/, '');
}

async function findLinkAndToken(linkId: string) {
  const tryPortal = await supabaseAdmin
    .from('portal.test_links')
    .select('id, token, name, reason, send_report, show_results')
    .eq('id', linkId)
    .maybeSingle();

  if (!tryPortal.error && tryPortal.data) return tryPortal.data;

  const tryPublic = await supabaseAdmin
    .from('public.test_links')
    .select('id, token, name, reason, send_report, show_results')
    .eq('id', linkId)
    .maybeSingle();

  if (!tryPublic.error && tryPublic.data) return tryPublic.data;

  throw new Error('Link not found in portal or public schema');
}

export async function POST(_req: Request, { params }: { params: { linkId: string } }) {
  try {
    const { linkId } = params;
    if (!linkId) return NextResponse.json({ ok: false, error: 'Missing linkId' }, { status: 400 });

    const body = await _req.json().catch(() => ({}));
    const { toEmail, toName } = body || {};
    if (!toEmail) return NextResponse.json({ ok: false, error: 'toEmail required' }, { status: 400 });

    if (!resend) throw new Error('RESEND_API_KEY not configured');

    const link = await findLinkAndToken(linkId);
    const linkUrl = `${baseUrl()}/t/${link.token}`;

    const subject = 'Your MindCanvas profile link';
    const greeting = toName ? `Hi ${toName},` : 'Hi there,';

    const html = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.6;">
        <p>${greeting}</p>
        <p>You’ve been invited to take a MindCanvas profile assessment.</p>
        <p><a href="${linkUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;border:1px solid #222;text-decoration:none;">Start your profile</a></p>
        ${
          link.show_results
            ? `<p>After you complete the test, your results will be shown on-screen.</p>`
            : `<p>After you complete the test, your results will be shared with your organization.</p>`
        }
        <p style="color:#666">This link was generated for you via MindCanvas.</p>
      </div>
    `;

    const sent = await resend.emails.send({
      from: 'MindCanvas <no-reply@yourdomain.com>',
      to: toEmail,
      subject,
      html,
    });

    // Handle different response structures from resend.emails.send
    if ((sent as any)?.error) {
      return NextResponse.json({ ok: false, error: (sent as any).error?.message || 'Email failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: (sent as any)?.data?.id || (sent as any)?.id || null
    });
  } catch (e: any) {
    console.error('Send link email error:', e);
    return NextResponse.json({ ok: false, error: e.message || 'Email failed' }, { status: 500 });
  }
}
