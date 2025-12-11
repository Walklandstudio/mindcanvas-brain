// apps/web/lib/server/emailTemplates.ts

import { createClient } from "@/lib/server/supabaseAdmin";

// ---------------------- Types ---------------------- //

export type EmailTemplateType =
  | "report"
  | "test_owner_notification"
  | "resend_report"
  | "send_test_link";

export type EmailTemplate = {
  type: EmailTemplateType;
  subject: string;
  body_html: string;
};

export type SendTemplatedEmailArgs = {
  orgId: string;
  type: EmailTemplateType;
  to: string;
  context: Record<string, string>;
};

export type SendTemplatedEmailResult =
  | { ok: true; data: any }
  | {
      ok: false;
      error: string;
      status?: number;
      body?: string;
    };

// ---------------------- Supabase helper ---------------------- //

function supaPortal() {
  return createClient().schema("portal");
}

// ---------------------- Default templates ---------------------- //

const DEFAULT_TEMPLATES: Record<EmailTemplateType, EmailTemplate> = {
  report: {
    type: "report",
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
  },

  test_owner_notification: {
    type: "test_owner_notification",
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
  },

  resend_report: {
    type: "resend_report",
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
  },

  send_test_link: {
    type: "send_test_link",
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
  },
};

// Helper so other files (templates API route) can fetch a default
export function getDefaultTemplate(type: EmailTemplateType): EmailTemplate {
  return DEFAULT_TEMPLATES[type];
}

// ---------------------- Load templates for an org ---------------------- //

export async function getOrgEmailTemplates(
  orgId: string
): Promise<EmailTemplate[]> {
  const sb = supaPortal();

  const { data, error } = await sb
    .from("email_templates")
    .select("type, subject, body_html")
    .eq("org_id", orgId);

  if (error) {
    console.warn(
      "[emailTemplates] load error, falling back to defaults:",
      error
    );
    return Object.values(DEFAULT_TEMPLATES);
  }

  const byType = new Map<EmailTemplateType, EmailTemplate>();

  // Start with defaults
  (Object.values(DEFAULT_TEMPLATES) as EmailTemplate[]).forEach((tpl) => {
    byType.set(tpl.type, tpl);
  });

  // Override with DB values if present
  (data || []).forEach((row: any) => {
    const t = row.type as EmailTemplateType;
    if (!t) return;
    byType.set(t, {
      type: t,
      subject: row.subject || DEFAULT_TEMPLATES[t].subject,
      body_html: row.body_html || DEFAULT_TEMPLATES[t].body_html,
    });
  });

  return Array.from(byType.values());
}

// ---------------------- Simple {{placeholder}} replacement ---------------------- //

function applyTemplate(
  source: string,
  context: Record<string, string>
): string {
  return source.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
    const value = context[key];
    return value != null ? String(value) : "";
  });
}

// ---------------------- OneSignal email send (v1 API, Basic auth) ---------------------- //

export async function sendTemplatedEmail(
  args: SendTemplatedEmailArgs
): Promise<SendTemplatedEmailResult> {
  const { orgId, type, to, context } = args;

  // Trim to avoid stray spaces/newlines from env storage
  const rawAppId = process.env.ONESIGNAL_APP_ID || "";
  const rawKey =
    process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY || "";

  const appId = rawAppId.trim();
  const apiKey = rawKey.trim();

  if (!appId || !apiKey) {
    console.warn(
      "[sendTemplatedEmail] Missing OneSignal env (ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY)"
    );
    return {
      ok: false,
      error: "missing_onesignal_env",
    };
  }

  // Debug: log a short prefix so we can verify it's the key you expect
  console.log(
    "[sendTemplatedEmail] using appId/apiKey prefixes",
    appId.slice(0, 8),
    apiKey.slice(0, 16)
  );

  // Load templates for this org (defaults merged in)
  const templates = await getOrgEmailTemplates(orgId);
  const template =
    templates.find((t) => t.type === type) || DEFAULT_TEMPLATES[type];

  const subject = applyTemplate(template.subject, context);
  const bodyHtml = applyTemplate(template.body_html, context);

  const payload = {
    app_id: appId,
    include_email_tokens: [to],
    email_subject: subject,
    email_body: bodyHtml,
  };

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[sendTemplatedEmail] OneSignal error",
        res.status,
        body.slice(0, 400)
      );
      return {
        ok: false,
        error: "onesignal_error",
        status: res.status,
        body: body.slice(0, 400),
      };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err: any) {
    console.error("[sendTemplatedEmail] Unexpected error", err);
    return {
      ok: false,
      error: "unexpected_error",
      body: String(err?.message || err),
    };
  }
}
