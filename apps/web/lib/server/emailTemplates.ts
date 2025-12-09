// apps/web/lib/server/emailTemplates.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import {
  sendTransactionalEmail,
  EmailTemplateType,
  EmailBranding,
} from './onesignalEmail';

// Service role client on the portal schema
function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: 'portal' } });
}

type TemplateContext = Record<string, string | null | undefined>;

function simpleTemplateMerge(template: string, ctx: TemplateContext): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => {
    const value = ctx[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

async function loadOrgBranding(orgId: string): Promise<EmailBranding> {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from('orgs')
    .select('name, email_logo_path, brand_primary')
    .eq('id', orgId)
    .maybeSingle();

  if (error || !data) {
    console.error('[emailTemplates] Failed to load org branding', error);
    return { orgName: 'MindCanvas' };
  }

  const rawBase =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith('http')
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : '');

  const cleanBase = (rawBase || '').replace(/\/$/, '');

  const logoUrl =
    data.email_logo_path && cleanBase
      ? `${cleanBase}/${data.email_logo_path.replace(/^\//, '')}`
      : undefined;

  return {
    orgName: data.name || 'MindCanvas',
    logoUrl,
    primaryColor: data.brand_primary ?? undefined,
  };
}

// ✅ Exported so API routes can reuse it
export function getDefaultTemplate(
  type: EmailTemplateType
): { subject: string; bodyHtml: string } {
  switch (type) {
    case 'report':
      return {
        subject: 'Your Quantum Source Code Report – {{test_name}}',
        bodyHtml: `
<p>Hi {{first_name}},</p>
<p>Thank you for completing the {{test_name}}.</p>
<p>Your personal report is ready. You can view it here:</p>
<p><a href="{{report_link}}" style="color:#38bdf8;">Open your report</a></p>
<p>If the button does not work, copy and paste this link into your browser:</p>
<p style="word-break:break-all;">{{report_link}}</p>
<p>Warm regards,<br/>{{org_name}}</p>
      `.trim(),
      };

    case 'test_owner_notification':
      return {
        subject: 'New test submission – {{test_name}}',
        bodyHtml: `
<p>Hi {{owner_name}},</p>
<p>{{first_name}} {{last_name}} has just completed the {{test_name}}.</p>
<p>You can view their report here:</p>
<p><a href="{{report_link}}" style="color:#38bdf8;">View report</a></p>
<p>Or open the test taker inside your portal dashboard for more details.</p>
<p>Regards,<br/>MindCanvas</p>
      `.trim(),
      };

    case 'resend_report':
      return {
        subject: 'Your Quantum Source Code Report link',
        bodyHtml: `
<p>Hi {{first_name}},</p>
<p>Here is your report link again for the {{test_name}}:</p>
<p><a href="{{report_link}}" style="color:#38bdf8;">Open your report</a></p>
<p>If needed, you can save or bookmark this link for future reference.</p>
<p>Warm regards,<br/>{{org_name}}</p>
      `.trim(),
      };

    case 'send_test_link':
      return {
        subject: 'Your link to complete the {{test_name}}',
        bodyHtml: `
<p>Hi {{first_name}},</p>
<p>You have been invited to complete the {{test_name}}.</p>
<p>Please click the link below to start your test:</p>
<p><a href="{{test_link}}" style="color:#38bdf8;">Start your test</a></p>
<p>If the link does not open, copy and paste this into your browser:</p>
<p style="word-break:break-all;">{{test_link}}</p>
<p>This assessment will help us provide you with a personalised report and insights.</p>
<p>Warm regards,<br/>{{org_name}}</p>
      `.trim(),
      };
  }
}

export async function loadTemplateForOrg(opts: {
  orgId: string;
  type: EmailTemplateType;
}): Promise<{ subject: string; bodyHtml: string; branding: EmailBranding }> {
  const supa = supaAdmin();

  const [branding, templateRes] = await Promise.all([
    loadOrgBranding(opts.orgId),
    supa
      .from('email_templates')
      .select('subject, body_html')
      .eq('org_id', opts.orgId)
      .eq('type', opts.type)
      .maybeSingle(),
  ]);

  const defaultTpl = getDefaultTemplate(opts.type);

  if (templateRes.error) {
    console.error('[emailTemplates] Failed to load template', templateRes.error);
    return { subject: defaultTpl.subject, bodyHtml: defaultTpl.bodyHtml, branding };
  }

  if (!templateRes.data) {
    return { subject: defaultTpl.subject, bodyHtml: defaultTpl.bodyHtml, branding };
  }

  return {
    subject: templateRes.data.subject,
    bodyHtml: templateRes.data.body_html,
    branding,
  };
}

export async function sendTemplatedEmail(opts: {
  orgId: string;
  type: EmailTemplateType;
  to: string;
  context: TemplateContext;
}) {
  const { subject, bodyHtml, branding } = await loadTemplateForOrg({
    orgId: opts.orgId,
    type: opts.type,
  });

  const mergedSubject = simpleTemplateMerge(subject, {
    ...opts.context,
    org_name: branding.orgName,
  });

  const mergedHtml = simpleTemplateMerge(bodyHtml, {
    ...opts.context,
    org_name: branding.orgName,
  });

  return await sendTransactionalEmail({
    to: opts.to,
    subject: mergedSubject,
    html: mergedHtml,
    branding,
  });
}

export type { EmailTemplateType }; // explicit re-export for clarity
