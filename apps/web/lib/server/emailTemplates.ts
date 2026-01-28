// apps/web/lib/server/emailTemplates.ts
import { createClient } from "@supabase/supabase-js";

export type EmailTemplateType =
  | "report"
  | "resend_report"
  | "test_owner_notification"
  | "send_test_link"
  | "test_taker_report";

export type EmailTemplate = {
  type: EmailTemplateType;
  subject: string;
  body_html: string;
};

type DbTemplateRow = {
  org_id: string;
  type: EmailTemplateType;
  subject: string;
  body_html: string;
};

function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

/**
 * Default templates used if an org has not customized theirs yet.
 */
export function getDefaultTemplate(type: EmailTemplateType): EmailTemplate {
  switch (type) {
    case "report":
      return {
        type,
        subject: "Your {{test_name}} Results",
        body_html: `
<p>Hi {{first_name}},</p>

<p>
Thank you for completing the <strong>{{test_name}}</strong>.
Your personalised report is now ready.
</p>

<p style="margin: 24px 0;">
  <a
    href="{{report_link}}"
    style="
      display:inline-block;
      padding:12px 20px;
      background:#2563eb;
      color:#ffffff;
      text-decoration:none;
      border-radius:6px;
      font-weight:600;
    "
  >
    View your report
  </a>
</p>

<p>
If the button above does not work, copy and paste the link below into your browser:
</p>

<p style="word-break:break-all;">
  {{report_link}}
</p>

<p style="margin-top:32px;">
Regards,<br />
<strong>{{org_name}}</strong>
</p>

<p>
For any queries, please contact us at
<a href="mailto:{{support_email}}">{{support_email}}</a>.
</p>
        `.trim(),
      };

    case "test_taker_report":
      // Default can mirror "report" unless you want separate copy later
      return {
        type,
        subject: "Your {{test_name}} Results",
        body_html: `
<p>Hi {{first_name}},</p>

<p>
Thank you for completing the <strong>{{test_name}}</strong>.
Your personalised report is now ready.
</p>

<p style="margin: 24px 0;">
  <a
    href="{{report_link}}"
    style="
      display:inline-block;
      padding:12px 20px;
      background:#2563eb;
      color:#ffffff;
      text-decoration:none;
      border-radius:6px;
      font-weight:600;
    "
  >
    View your report
  </a>
</p>

<p>
If the button above does not work, copy and paste the link below into your browser:
</p>

<p style="word-break:break-all;">
  {{report_link}}
</p>

<p style="margin-top:32px;">
Regards,<br />
<strong>{{org_name}}</strong>
</p>

<p>
For any queries, please contact us at
<a href="mailto:{{support_email}}">{{support_email}}</a>.
</p>
        `.trim(),
      };

    case "resend_report":
      return {
        type,
        subject: "Your {{test_name}} Results",
        body_html: `
<p>Hi {{first_name}},</p>

<p>
As requested, here is your link to access the results for
<strong>{{test_name}}</strong>.
</p>

<p style="margin: 24px 0;">
  <a
    href="{{report_link}}"
    style="
      display:inline-block;
      padding:12px 20px;
      background:#2563eb;
      color:#ffffff;
      text-decoration:none;
      border-radius:6px;
      font-weight:600;
    "
  >
    View your report
  </a>
</p>

<p>
If the button above does not work, copy and paste the link below into your browser:
</p>

<p style="word-break:break-all;">
  {{report_link}}
</p>

<p style="margin-top:32px;">
Regards,<br />
<strong>{{org_name}}</strong>
</p>

<p>
For any queries, please contact us at
<a href="mailto:{{support_email}}">{{support_email}}</a>.
</p>
        `.trim(),
      };

    case "send_test_link":
      return {
        type,
        subject: "You’ve been invited to complete {{test_name}}",
        body_html: `
<p>Hi {{first_name}},</p>

<p>
You’ve been invited to complete the <strong>{{test_name}}</strong>.
</p>

<p style="margin: 24px 0;">
  <a
    href="{{test_link}}"
    style="
      display:inline-block;
      padding:12px 20px;
      background:#2563eb;
      color:#ffffff;
      text-decoration:none;
      border-radius:6px;
      font-weight:600;
    "
  >
    Start your assessment
  </a>
</p>

<p>
If the button above does not work, copy and paste the link below into your browser:
</p>

<p style="word-break:break-all;">
  {{test_link}}
</p>

<p>
Once completed, you will receive your personalised report via email.
</p>

<p style="margin-top:32px;">
Regards,<br />
<strong>{{org_name}}</strong>
</p>

<p>
For any queries, please contact us at
<a href="mailto:{{support_email}}">{{support_email}}</a>.
</p>
        `.trim(),
      };

    case "test_owner_notification":
      return {
        type,
        subject: "{{test_taker_full_name}} completed the {{test_name}}",
        body_html: `
<p>Hello,</p>

<p>
The following test has just been completed:
</p>

<ul>
  <li><strong>Test:</strong> {{test_name}}</li>
  <li><strong>Name:</strong> {{test_taker_full_name}}</li>
  <li><strong>Email:</strong> {{test_taker_email}}</li>
  <li><strong>Mobile:</strong> {{test_taker_mobile}}</li>
  <li><strong>Organisation:</strong> {{test_taker_org}}</li>
</ul>

<p>
<strong>Internal Test Taker Report:</strong><br />
<a href="{{internal_report_link}}">{{internal_report_link}}</a>
</p>

<p>
<strong>Results Dashboard:</strong><br />
<a href="{{internal_results_dashboard_link}}">
{{internal_results_dashboard_link}}
</a>
</p>

<p style="margin-top:32px;">
Regards,<br />
<strong>{{org_name}}</strong>
</p>
        `.trim(),
      };
  }
}

/**
 * Simple {{placeholder}} replacement helper.
 */
function renderTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const v = context[key];
    return typeof v === "string" ? v : "";
  });
}

/**
 * Load an org’s template overrides, falling back to defaults.
 */
export async function loadOrgTemplates(orgId: string): Promise<EmailTemplate[]> {
  const supa = supaAdmin();
  const { data } = await supa
    .from("communication_templates" as any)
    .select("org_id, type, subject, body_html")
    .eq("org_id", orgId);

  const rows = (data as DbTemplateRow[] | null) ?? [];
  const byType = new Map<EmailTemplateType, DbTemplateRow>();
  rows.forEach((r) => byType.set(r.type, r));

  const allTypes: EmailTemplateType[] = [
    "report",
    "test_taker_report",
    "resend_report",
    "send_test_link",
    "test_owner_notification",
  ];

  return allTypes.map((t) => {
    const existing = byType.get(t);
    if (existing) {
      return {
        type: t,
        subject: existing.subject,
        body_html: existing.body_html,
      };
    }
    const def = getDefaultTemplate(t);
    return { type: t, subject: def.subject, body_html: def.body_html };
  });
}

/**
 * Send an email via OneSignal using the org’s template for the given type.
 */
export async function sendTemplatedEmail(args: {
  orgId: string;
  type: EmailTemplateType;
  to: string;
  context: Record<string, string>;
}): Promise<{ ok: boolean; error?: string; status?: number; body?: string }> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey =
    process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY || "";

  if (!appId || !apiKey) {
    return { ok: false, error: "missing_env" };
  }

  const templates = await loadOrgTemplates(args.orgId);
  const tpl =
    templates.find((t) => t.type === args.type) ||
    getDefaultTemplate(args.type);

  const subject = renderTemplate(tpl.subject, args.context);
  const bodyHtml = renderTemplate(tpl.body_html, args.context);

  const payload = {
    app_id: appId,
    include_email_tokens: [args.to],
    email_subject: subject,
    email_body: bodyHtml,
  };

  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: "onesignal_error",
        status: res.status,
        body: text,
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "unexpected_error" };
  }
}


