// apps/web/app/portal/[slug]/links/LinksClient.tsx
"use client";

import { useEffect, useState } from "react";
import { getBaseUrl } from "@/lib/baseUrl";

type Test = {
  id: string;
  name: string;
  test_type?: string | null;
  is_active?: boolean | null;
};

type LinkRow = {
  id: string;
  token: string;
  created_at: string | null;
  show_results: boolean | null;
  is_active: boolean | null;
  expires_at: string | null;
  test_name: string | null;
  contact_owner: string | null;
  email_report: boolean;
};

export default function LinksClient(props: {
  orgId: string;
  orgSlug: string;
  orgName: string;
}) {
  const { orgId, orgSlug, orgName } = props;

  const [tests, setTests] = useState<Test[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  const [testId, setTestId] = useState("");
  const [testDisplayName, setTestDisplayName] = useState("");
  const [contactOwner, setContactOwner] = useState("");
  const [showResults, setShowResults] = useState(true);
  const [emailReport, setEmailReport] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Email via OneSignal (optional)
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  // When results are hidden
  const [redirectUrl, setRedirectUrl] = useState("");
  const [hiddenResultsMessage, setHiddenResultsMessage] = useState("");

  // When results are shown (report page CTA)
  const [nextStepsUrl, setNextStepsUrl] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const baseUrl = getBaseUrl();
  
  // fetch helpers (uncached)
  const fetchJSON = async (url: string) => {
    const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`);
    const j = await r.json();
    if (!r.ok || (j && j.error)) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  };

  // Fetch tests
  useEffect(() => {
    fetchJSON(`/api/admin/tests?orgId=${orgId}`)
      .then((d) => setTests(Array.isArray(d) ? d : []))
      .catch((e: any) => {
        setTests([]);
        setStatus(`Tests load error: ${e.message}`);
        console.error("tests error", e);
      });
  }, [orgId]);

  // Fetch recent links
  const refreshLinks = () => {
    setLoadingLinks(true);
    fetchJSON(`/api/admin/links?orgId=${orgId}`)
      .then((d) => setLinks(Array.isArray(d) ? d : []))
      .catch((e: any) => {
        setLinks([]);
        setStatus(`Links load error: ${e.message}`);
        console.error("links error", e);
      })
      .finally(() => setLoadingLinks(false));
  };
  useEffect(refreshLinks, [orgId]);

  const fullLink = (token: string) => `${baseUrl}/t/${token}`;
  const embedCode = (url: string) =>
    `<iframe src="${url}" width="100%" height="800" frameborder="0"></iframe>`;
  const htmlButton = (url: string) =>
    `<a href="${url}" style="background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;text-align:center;display:inline-block;">Start your test</a>`;

  const doCopy = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(label || "Copied!");
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus("Copy failed");
    }
  };

  const downloadTxt = (content: string, filename: string) => {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatus("Download failed");
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const isValidUrl = (value: string) => {
    const v = value.trim();
    if (!v) return false;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  };

  const generate = async () => {
    setLoading(true);
    setStatus(null);

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(testId)) {
      setStatus("Please select a valid test (missing ID). Try reselecting.");
      setLoading(false);
      return;
    }

    // REQUIRED RULES
    if (!showResults) {
      if (!isValidUrl(redirectUrl)) {
        setStatus("Redirect URL is required when results are hidden.");
        setLoading(false);
        return;
      }
    } else {
      if (!isValidUrl(nextStepsUrl)) {
        setStatus("Next steps URL is required when results are shown.");
        setLoading(false);
        return;
      }
    }

    try {
      const messageToSave =
        !showResults && hiddenResultsMessage.trim().length > 0
          ? hiddenResultsMessage.trim()
          : null;

      const res = await fetch("/api/admin/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          testId,
          testDisplayName,
          contactOwner,
          showResults,
          emailReport,
          hiddenResultsMessage: messageToSave,

          // NEW
          redirectUrl: !showResults ? redirectUrl.trim() : null,
          nextStepsUrl: showResults ? nextStepsUrl.trim() : null,

          expiresAt: expiresAt || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      let message = "Link created!";
      const token: string | undefined = data?.token;

      const shouldSendEmail = sendEmail && !!recipientEmail && !!token;

      if (shouldSendEmail) {
        const url = fullLink(token!);
        const selectedTest = tests.find((t) => t.id === testId) || null;
        const emailTestName =
          testDisplayName || selectedTest?.name || "Profile Test";

        try {
          // ✅ This endpoint will now use sendTemplatedEmail("send_test_link")
          const emailRes = await fetch("/api/portal/links/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId,                 // ✅ NEW (so templates + org profile can be loaded)
              orgSlug,               // optional, but useful for debugging
              email: recipientEmail,
              linkUrl: url,
              orgName,
              testName: emailTestName,
            }),
          });

          const emailJson = await emailRes.json().catch(() => ({} as any));

          if (!emailRes.ok || emailJson?.error) {
            console.error("send-email error", emailRes.status, emailJson);
            message = "Link created, but sending the email failed.";
          } else if (emailJson?.skipped) {
            message = "Link created (email skipped — OneSignal not configured).";
          } else {
            message = "Link created and email sent!";
          }
        } catch (err) {
          console.error("send-email error", err);
          message = "Link created, but sending the email failed.";
        }
      }

      setStatus(message);

      await new Promise((r) => setTimeout(r, 500));
      refreshLinks();
    } catch (e: any) {
      setStatus(e?.message || "Error creating link");
      console.error("create-link error", e);
    } finally {
      setLoading(false);
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!linkId) return;
    const confirmDelete = window.confirm(
      "Delete this link? The URL will stop working for anyone who has it."
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/tests/links/${linkId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setStatus("Link deleted");
      setTimeout(() => setStatus(null), 2000);
    } catch (e: any) {
      console.error("delete-link error", e);
      setStatus(e?.message || "Failed to delete link");
    }
  };

  const showHiddenMessageField = !showResults;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* LEFT: Generate form */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Generate Test Link</h2>
          <p className="text-sm text-gray-600">
            Generate a test link and optionally send it to a recipient.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Select test</span>
            <select
              className="w-full rounded border border-gray-300 bg-white p-2 text-sm"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
            >
              <option value="">Select test...</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.test_type ? ` (${t.test_type})` : ""}
                </option>
              ))}
            </select>
            {!tests.length && (
              <span className="mt-1 block text-xs text-gray-500">
                No tests found for this organisation. Create one under the{" "}
                <em>Tests</em> tab.
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Test name / Test purpose</span>
            <input
              type="text"
              className="w-full rounded border border-gray-300 p-2 text-sm"
              placeholder="e.g. QSC Leaders — Sales team intake"
              value={testDisplayName}
              onChange={(e) => setTestDisplayName(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Contact owner's name</span>
            <input
              type="text"
              className="w-full rounded border border-gray-300 p-2 text-sm"
              placeholder="e.g. Sarah Ndlovu"
              value={contactOwner}
              onChange={(e) => setContactOwner(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Recipient email (optional)</span>
            <input
              type="email"
              className="w-full rounded border border-gray-300 p-2 text-sm"
              placeholder="e.g. person@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span>
              Send this link to the recipient via email{" "}
              <span className="text-gray-500">(OneSignal)</span>
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
            />
            <span>
              Show results to taker <span className="text-gray-500">after completion</span>
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={emailReport}
              onChange={(e) => setEmailReport(e.target.checked)}
            />
            <span>Email the report</span>
          </label>

          {!showResults && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Redirect URL <span className="text-red-600">*</span>
              </span>
              <input
                type="url"
                className="w-full rounded border border-gray-300 p-2 text-sm"
                placeholder="e.g. https://your-site.com/thank-you"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
              />
              <span className="mt-1 block text-xs text-gray-500">
                If results are hidden, the test taker will be redirected here after completing the test.
              </span>
            </label>
          )}

          {showResults && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Next steps URL <span className="text-red-600">*</span>
              </span>
              <input
                type="url"
                className="w-full rounded border border-gray-300 p-2 text-sm"
                placeholder="e.g. https://your-site.com/book-a-call"
                value={nextStepsUrl}
                onChange={(e) => setNextStepsUrl(e.target.value)}
              />
              <span className="mt-1 block text-xs text-gray-500">
                This will be used as the “Next steps” call-to-action link on the report.
              </span>
            </label>
          )}

          {showHiddenMessageField && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Message to show instead of results (optional)
              </span>
              <textarea
                className="min-h-[80px] w-full rounded border border-gray-300 p-2 text-sm"
                placeholder="e.g. Thank you for completing this assessment. Your facilitator will share your insights during the upcoming workshop."
                value={hiddenResultsMessage}
                onChange={(e) => setHiddenResultsMessage(e.target.value)}
              />
              <span className="mt-1 block text-xs text-gray-500">
                This message may be shown to the test taker when results are hidden.
              </span>
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Expiry (optional)</span>
            <input
              type="datetime-local"
              className="w-full rounded border border-gray-300 p-2 text-sm"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <span className="mt-1 block text-xs text-gray-500">
              If left blank, the link never expires.
            </span>
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={generate}
            className="mt-2 w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate link"}
          </button>

          {status && <p className="mt-2 text-sm text-gray-700">{status}</p>}
        </div>
      </div>

      {/* RIGHT: Recent links */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent links — {orgName}</h2>
          <button
            type="button"
            onClick={refreshLinks}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
            disabled={loadingLinks}
            title="Reload"
          >
            {loadingLinks ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Test name / Test purpose</th>
                <th className="px-3 py-2 text-left font-medium">Created</th>
                <th className="px-3 py-2 text-left font-medium">Results</th>
                <th className="px-3 py-2 text-left font-medium">Expiry</th>
                <th className="px-3 py-2 text-left font-medium">Link</th>
                <th className="px-3 py-2 text-left font-medium">Copy</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No links yet.
                  </td>
                </tr>
              )}

              {links.map((r, idx) => {
                const url = fullLink(r.token);
                const expired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";

                return (
                  <tr key={r.id} className={`${rowBg} border-t`}>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{r.test_name || "Untitled link"}</div>
                      {r.contact_owner && (
                        <div className="text-xs text-gray-500">Owner: {r.contact_owner}</div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>

                    <td className="px-3 py-2 align-top">
                      {r.show_results ? "Shown" : "Hidden"}
                      {!r.email_report && (
                        <div className="text-xs text-gray-500">Report not emailed</div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      {r.expires_at
                        ? `${new Date(r.expires_at).toLocaleString()}${expired ? " (expired)" : ""}`
                        : "—"}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => window.open(url, "_blank")}
                        className="text-blue-600 underline"
                      >
                        Open link
                      </button>
                    </td>

                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => doCopy(url, "URL copied")}
                        >
                          URL
                        </button>

                        <button
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => downloadTxt(embedCode(url), `mindcanvas-embed-${r.token}.txt`)}
                          title="Download the embed code as a .txt file"
                        >
                          Download embed
                        </button>

                        <button
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => doCopy(htmlButton(url), "Snippet copied")}
                        >
                          Snippet
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => deleteLink(r.id)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {status && <p className="mt-2 text-xs text-gray-500">{status}</p>}
      </div>
    </div>
  );
}
