// apps/web/lib/server/emailTemplates.ts
import { createClient } from "@supabase/supabase-js";

export type EmailTemplateType =
  | "report"
  | "resend_report"
  | "test_owner_notification"
  | "send_test_link";

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
      return {
        type,
        subject: "{{test_taker_full_name}} completed the {{test_name}}",
        body_html: `
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
      return {
        type,
        subject: "Your {{test_name}} Results",
        body_html: `
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
      return {
        type,
        subject: "Your link to complete the {{test_name}}",
        body_html: `
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
export async function loadOrgTemplates(
  orgId: string
): Promise<EmailTemplate[]> {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("communication_templates" as any)
    .select("org_id, type, subject, body_html")
    .eq("org_id", orgId);

  if (error) {
    console.warn("[emailTemplates] loadOrgTemplates error", error.message);
  }

  const rows = (data as DbTemplateRow[] | null) ?? [];
  const byType = new Map<EmailTemplateType, DbTemplateRow>();
  rows.forEach((r) => byType.set(r.type, r));

  const allTypes: EmailTemplateType[] = [
    "report",
    "test_owner_notification",
    "resend_report",
    "send_test_link",
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
    console.warn(
      "[sendTemplatedEmail] Missing OneSignal env vars",
      !!appId,
      !!apiKey
    );
    return { ok: false, error: "missing_env" };
  }

  // Load templates and pick the right one
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
    console.log(
      "[sendTemplatedEmail] calling OneSignal",
      appId.slice(0, 6),
      apiKey.slice(0, 8)
    );

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
      console.error(
        "[sendTemplatedEmail] OneSignal error",
        res.status,
        text.slice(0, 400)
      );
      return {
        ok: false,
        error: "onesignal_error",
        status: res.status,
        body: text,
      };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[sendTemplatedEmail] Unexpected error", err);
    return { ok: false, error: "unexpected_error" };
  }
}
