// apps/web/lib/server/emailTemplates.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  sendTransactionalEmail,
  EmailTemplateType,
  EmailBranding,
} from "./onesignalEmail";

// Service role client on the portal schema
function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

type TemplateContext = Record<string, string | null | undefined>;

function simpleTemplateMerge(template: string, ctx: TemplateContext): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => {
    const value = ctx[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}

async function loadOrgBranding(orgId: string): Promise<EmailBranding> {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("orgs")
    .select("name, email_logo_path, brand_primary")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) {
    console.error("[emailTemplates] Failed to load org branding", error);
    return { orgName: "MindCanvas" };
  }

  const rawBase =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");

  const cleanBase = (rawBase || "").replace(/\/$/, "");

  const logoUrl =
    data.email_logo_path && cleanBase
      ? `${cleanBase}/${data.email_logo_path.replace(/^\//, "")}`
      : undefined;

  return {
    orgName: data.name || "MindCanvas",
    logoUrl,
    primaryColor: data.brand_primary ?? undefined,
  };
}

// 👇 YOUR DEFAULT TEMPLATES
export function getDefaultTemplate(
  type: EmailTemplateType
): { subject: string; bodyHtml: string } {
  switch (type) {
    case "report":
      // Notification 1 - Test Completed - Test Taker (Email 1 - Report)
      return {
        subject: "Your {{test_name}} Results",
        bodyHtml: `
<p>Dear {{first_name}},</p>

<p>
  Congratulations on completing the {{test_name}}. I wanted to take a moment to
  share your unique results with you and your next steps.
</p>

<p><strong>Step 1:</strong>
  <a href="{{report_link}}">CLICK HERE</a> to open your personalised report link.
</p>

<p><strong>Step 2:</strong>
  <a href="{{next_steps_link}}">CLICK HERE</a> to explore your next steps actions.
</p>

<p>
  I look forward to working with you further and exploring your profile results.
</p>

<p>
  Regards,<br/>
  {{owner_full_name}}<br/>
  Founder @ {{test_name}}<br/>
  {{owner_website}}
</p>

<p>
  For any queries, please contact us at {{owner_email}}.
</p>
      `.trim(),
      };

    case "test_owner_notification":
      // Notification 1 - Test Completed - Test Owner (Email 2 - Test Owner Notification)
      return {
        subject:
          "{{test_taker_full_name}} completed the {{test_name}}",
        bodyHtml: `
<p>Dear {{owner_first_name}},</p>

<p>Please see details below of the completed test:</p>

<ul>
  <li><strong>Test Name:</strong> {{test_name}}</li>
  <li><strong>Name:</strong> {{test_taker_full_name}}</li>
  <li><strong>Email:</strong> {{test_taker_email}}</li>
  <li><strong>Mobile:</strong> {{test_taker_mobile}}</li>
  <li><strong>Organisation:</strong> {{test_taker_org}}</li>
</ul>

<p>
  <strong>Internal Test Taker Report:</strong>
  <a href="{{internal_report_link}}">{{internal_report_link}}</a>
</p>

<p>
  <strong>Internal Test Taker Results Dashboard:</strong>
  <a href="{{internal_results_dashboard_link}}">{{internal_results_dashboard_link}}</a>
</p>

<p>
  Regards,<br/>
  Daniel @ profiletest.ai
</p>

<p>
  For any queries, please contact us at support@profiletest.ai.
</p>
      `.trim(),
      };

    case "resend_report":
      // Notification 2 - Resend Report - Test Taker (Email 3 - Report Resend)
      return {
        subject: "Your {{test_name}} Results",
        bodyHtml: `
<p>Dear {{first_name}},</p>

<p>
  Please find below your results and other links that you need with regards to
  your {{test_name}} results.
</p>

<p>
  <strong>Step 1:</strong>
  <a href="{{report_link}}">CLICK HERE</a> to open your personalised report link.
</p>

<p>
  I look forward to working with you further and exploring your profile results.
</p>

<p>
  Regards,<br/>
  {{owner_full_name}}<br/>
  Founder @ {{test_name}}<br/>
  {{owner_website}}
</p>

<p>
  For any queries, please contact us at {{owner_email}}.
</p>
      `.trim(),
      };

    case "send_test_link":
      // Simple invite for now – we can rewrite to your exact wording later
      return {
        subject: "Your link to complete the {{test_name}}",
        bodyHtml: `
<p>Hi {{first_name}},</p>

<p>
  You’ve been invited to complete the {{test_name}}.
</p>

<p>
  <strong>Start your test here:</strong><br/>
  <a href="{{test_link}}">{{test_link}}</a>
</p>

<p>
  Once you’ve completed your test, you’ll receive your personalised report.
</p>

<p>
  Warm regards,<br/>
  {{org_name}}
</p>
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
      .from("email_templates")
      .select("subject, body_html")
      .eq("org_id", opts.orgId)
      .eq("type", opts.type)
      .maybeSingle(),
  ]);

  const fallback = getDefaultTemplate(opts.type);

  if (templateRes.error) {
    console.error("[emailTemplates] Failed to load template", templateRes.error);
    return {
      subject: fallback.subject,
      bodyHtml: fallback.bodyHtml,
      branding,
    };
  }

  if (!templateRes.data) {
    return {
      subject: fallback.subject,
      bodyHtml: fallback.bodyHtml,
      branding,
    };
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

// Explicit export so other modules can import the type
export type { EmailTemplateType };
