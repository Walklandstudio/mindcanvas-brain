// apps/web/lib/server/onesignalEmail.ts
import 'server-only';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
// Prefer REST API key if present, fall back to ONESIGNAL_API_KEY
const ONESIGNAL_API_KEY =
  process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY || '';

const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM_ADDRESS || 'no-reply@profiletest.app';
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || 'MindCanvas';

if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
  console.warn(
    '[onesignalEmail] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY/ONESIGNAL_API_KEY is not set. ' +
      'Transactional emails will not be sent until these are configured.'
  );
}

export type EmailTemplateType =
  | 'report'
  | 'test_owner_notification'
  | 'resend_report'
  | 'send_test_link';

export type EmailBranding = {
  orgName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  branding?: EmailBranding;
  includeUnsubscribed?: boolean;
}

/**
 * Very simple branded wrapper for email HTML.
 */
function wrapHtmlWithBranding(html: string, branding?: EmailBranding): string {
  const primary = branding?.primaryColor || '#0F172A';
  const orgName = branding?.orgName || 'MindCanvas';
  const logoImg = branding?.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${orgName} logo" style="max-height:48px; margin-bottom:16px;" />`
    : '';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>${orgName}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#0b1220; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0b1220; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#020617; border-radius:16px; padding:32px; color:#e5e7eb;">
            <tr>
              <td align="left" style="text-align:left;">
                ${logoImg}
                <h1 style="font-size:20px; margin:0 0 16px; color:${primary};">${orgName}</h1>
                <div style="font-size:14px; line-height:1.6; color:#e5e7eb;">
                  ${html}
                </div>
                <p style="font-size:11px; color:#64748b; margin-top:32px;">
                  This email was sent via MindCanvas on behalf of ${orgName}.
                  These are service-related (transactional) messages, not marketing emails.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends a transactional email via OneSignal's notifications API.
 */
export async function sendTransactionalEmail(opts: SendEmailOptions) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.error(
      '[onesignalEmail] Missing OneSignal env vars, skipping send.'
    );
    return { ok: false as const, error: 'missing_env' };
  }

  const wrappedHtml = wrapHtmlWithBranding(opts.html, opts.branding);

  const payload: Record<string, any> = {
    app_id: ONESIGNAL_APP_ID,
    include_email_tokens: [opts.to],
    email_subject: opts.subject,
    email_body: wrappedHtml,
    include_unsubscribed: opts.includeUnsubscribed ?? true,
  };

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[onesignalEmail] OneSignal error', res.status, text.slice(0, 400));
    return { ok: false as const, error: 'onesignal_error', status: res.status, body: text };
  }

  const data = await res.json().catch(() => ({}));
  return { ok: true as const, data };
}
