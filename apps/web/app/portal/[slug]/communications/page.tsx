"use client";

import { useEffect, useState } from "react";

type EmailTemplateType =
  | "report"
  | "test_owner_notification"
  | "resend_report"
  | "send_test_link";

type TemplateRow = {
  type: EmailTemplateType;
  subject: string;
  body_html: string;
};

const TYPE_LABELS: Record<EmailTemplateType, string> = {
  report: "Report Email",
  test_owner_notification: "Test Owner Notification",
  resend_report: "Resend Report",
  send_test_link: "Send Test Link to Test Taker",
};

const TYPE_DESCRIPTIONS: Record<EmailTemplateType, string> = {
  report:
    "Sent to the test taker when their report is ready, after completing a test.",
  test_owner_notification:
    "Sent to the test owner/admin when a new submission is completed.",
  resend_report:
    "Used when you manually resend a test taker's report from their profile.",
  send_test_link:
    "Used when you send a test invitation link to a test taker from the portal.",
};

const PLACEHOLDERS: Record<EmailTemplateType, string[]> = {
  report: [
    "{{first_name}}",
    "{{test_name}}",
    "{{report_link}}",
    "{{next_steps_link}}",
    "{{owner_full_name}}",
    "{{owner_website}}",
    "{{owner_email}}",
    "{{org_name}}",
  ],
  test_owner_notification: [
    "{{owner_first_name}}",
    "{{test_taker_full_name}}",
    "{{test_taker_email}}",
    "{{test_taker_mobile}}",
    "{{test_taker_org}}",
    "{{internal_report_link}}",
    "{{internal_results_dashboard_link}}",
    "{{test_name}}",
  ],
  resend_report: [
    "{{first_name}}",
    "{{test_name}}",
    "{{report_link}}",
    "{{owner_full_name}}",
    "{{owner_website}}",
    "{{owner_email}}",
    "{{org_name}}",
  ],
  send_test_link: [
    "{{first_name}}",
    "{{test_name}}",
    "{{test_link}}",
    "{{org_name}}",
  ],
};

// Built-in defaults (your wording)
const DEFAULT_TEMPLATES: TemplateRow[] = [
  {
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
  {
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
  {
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
  {
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
];

async function fetchTemplatesFromApi(slug: string): Promise<TemplateRow[]> {
  const res = await fetch(
    `/api/portal/${slug}/communications/templates`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to load communication templates");
  }
  return res.json();
}

async function saveTemplates(slug: string, templates: TemplateRow[]) {
  const res = await fetch(
    `/api/portal/${slug}/communications/templates`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to save templates");
  }
}

export default function CommunicationsPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setUsingFallback(false);

    fetchTemplatesFromApi(slug)
      .then((rows) => {
        if (!cancelled) {
          setTemplates(rows);
        }
      })
      .catch((err) => {
        console.error("[communications/page] Failed to load from API", err);
        if (!cancelled) {
          setTemplates(DEFAULT_TEMPLATES);
          setUsingFallback(true);
          setError(
            "Could not load communication templates from the server. Showing default templates instead."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const updateField = (
    type: EmailTemplateType,
    field: keyof TemplateRow,
    value: string
  ) => {
    if (!templates) return;
    setTemplates(
      templates.map((tpl) =>
        tpl.type === type ? { ...tpl, [field]: value } : tpl
      )
    );
  };

  const handleSave = async () => {
    if (!templates) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveTemplates(slug, templates);
      setSuccess("Templates saved successfully.");
      setUsingFallback(false);
    } catch (e) {
      setError("Could not save templates. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">
          Communications
        </h1>
        <p className="mt-1 text-sm text-slate-200/80">
          Configure the transactional emails sent to your test takers and test
          owners. These are service-related messages, not marketing emails.
        </p>
      </header>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {usingFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          These templates are currently using the built-in defaults. Once the
          backend connection is working, saving changes here will store your
          custom versions in the database.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-sm text-slate-300">Loading templates…</div>
      )}

      {/* Content */}
      {!loading && templates && (
        <>
          <div className="space-y-6">
            {templates.map((tpl) => (
              <section
                key={tpl.type}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {TYPE_LABELS[tpl.type]}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      {TYPE_DESCRIPTIONS[tpl.type]}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Placeholders:{" "}
                      <span className="font-mono">
                        {PLACEHOLDERS[tpl.type].join(", ")}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Subject
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                      value={tpl.subject}
                      onChange={(e) =>
                        updateField(tpl.type, "subject", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Body (HTML or plain text)
                    </label>
                    <textarea
                      className="mt-1 h-40 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                      value={tpl.body_html}
                      onChange={(e) =>
                        updateField(tpl.type, "body_html", e.target.value)
                      }
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      You can paste simple HTML or write formatted text. The
                      MindCanvas email layout and your org logo from{" "}
                      <span className="font-mono">/public/org-graphics</span>{" "}
                      will be wrapped around this body automatically.
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save templates"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
