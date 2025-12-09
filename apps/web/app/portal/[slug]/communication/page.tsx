// apps/web/app/portal/[slug]/communications/page.tsx
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
  report: ["{{first_name}}", "{{test_name}}", "{{report_link}}", "{{org_name}}"],
  test_owner_notification: [
    "{{owner_name}}",
    "{{first_name}}",
    "{{last_name}}",
    "{{test_name}}",
    "{{report_link}}",
    "{{org_name}}",
  ],
  resend_report: [
    "{{first_name}}",
    "{{test_name}}",
    "{{report_link}}",
    "{{org_name}}",
  ],
  send_test_link: [
    "{{first_name}}",
    "{{test_name}}",
    "{{test_link}}",
    "{{org_name}}",
  ],
};

async function fetchTemplates(slug: string): Promise<TemplateRow[]> {
  const res = await fetch(`/api/portal/${slug}/communication/templates`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load communication templates");
  }
  return res.json();
}

async function saveTemplates(slug: string, templates: TemplateRow[]) {
  const res = await fetch(`/api/portal/${slug}/communication/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templates }),
  });
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);

    fetchTemplates(slug)
      .then((rows) => {
        if (!cancelled) {
          setTemplates(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load communication templates.");
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
        <p className="mt-1 text-sm text-slate-300">
          Configure the transactional emails sent to your test takers and test
          owners. These are service-related messages, not marketing emails.
        </p>
      </header>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-100">
          {success}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-sm text-slate-400">Loading templates…</div>
      )}

      {/* Content */}
      {!loading && templates && (
        <>
          <div className="space-y-6">
            {templates.map((tpl) => (
              <section
                key={tpl.type}
                className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-slate-50">
                      {TYPE_LABELS[tpl.type]}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
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
                    <label className="block text-xs font-medium text-slate-300">
                      Subject
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      value={tpl.subject}
                      onChange={(e) =>
                        updateField(tpl.type, "subject", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Body (HTML or plain text)
                    </label>
                    <textarea
                      className="mt-1 h-40 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
              className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save templates"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
