"use client";

import { useEffect, useState } from "react";

type Test = {
  id: string;
  name: string;
  test_type?: string | null;
  is_active?: boolean | null;
};

type LinkRow = {
  token: string;
  created_at: string | null;
  show_results: boolean | null;
  is_active: boolean | null;
  expires_at: string | null;
  test_name: string;
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

  // NEW: custom message when results are hidden
  const [hiddenResultsMessage, setHiddenResultsMessage] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://mindcanvas.app";

  // fetch helpers (uncached)
  const fetchJSON = async (url: string) => {
    const r = await fetch(
      `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`
    );
    const j = await r.json();
    if (!r.ok || (j && j.error)) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  };

  // Fetch tests
  useEffect(() => {
    fetchJSON(`/api/admin/tests?orgId=${orgId}`)
      .then((d) => setTests(Array.isArray(d) ? d : []))
      .catch((e) => {
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
      .catch((e) => {
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

  const generate = async () => {
    setLoading(true);
    setStatus(null);

    // UUID sanity
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(testId)) {
      setStatus(
        "Please select a valid test (missing ID). Try reselecting."
      );
      setLoading(false);
      return;
    }

    try {
      // Only send a hidden message if results are off (and user wrote something)
      const messageToSave =
        !showResults &&
        !emailReport &&
        hiddenResultsMessage.trim().length > 0
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
          redirectUrl: null,
          expiresAt: expiresAt || null,
          // NOTE: we’re handling OneSignal separately below, so no recipientEmail here.
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      let message = "Link created!";
      const token: string | undefined = data?.token;

      // Optional OneSignal email
      const shouldSendEmail =
        sendEmail && !!recipientEmail && !!token;

      if (shouldSendEmail) {
        const url = fullLink(token!);
        const selectedTest =
          tests.find((t) => t.id === testId) || null;
        const emailTestName =
          testDisplayName ||
          selectedTest?.name ||
          "Profile Test";

        try {
          const emailRes = await fetch(
            "/api/portal/links/send-email",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: recipientEmail,
                linkUrl: url,
                orgName,
                testName: emailTestName,
              }),
            }
          );

          const emailJson = await emailRes
            .json()
            .catch(() => ({} as any));

          if (!emailRes.ok || emailJson?.error) {
            console.error(
              "send-email error",
              emailRes.status,
              emailJson
            );
            message =
              "Link created, but sending the email failed.";
          } else if (emailJson?.skipped) {
            message =
              "Link created (email skipped — OneSignal not configured).";
          } else {
            message = "Link created and email sent!";
          }
        } catch (err) {
          console.error("send-email error", err);
          message =
            "Link created, but sending the email failed.";
        }
      }

      setStatus(message);

      // small delay to avoid replica lag, then refresh (uncached)
      await new Promise((r) => setTimeout(r, 500));
      refreshLinks();
    } catch (e: any) {
      setStatus(e?.message || "Error creating link");
      console.error("create-link error", e);
    } finally {
      setLoading(false);
    }
  };

  const showHiddenMessageField = !showResults && !emailReport;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Generate Test Link</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Generate a test link. Optionally email it to a recipient.
        </p>

        <div className="space-y-3 border p-4 rounded-lg bg-white">
          <label className="block text-sm">
            <span className="block mb-1">Select test</span>
            <select
              className="w-full rounded border p-2"
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
              <span className="text-xs text-gray-500 mt-1 block">
                No tests found for this organisation. Create one
                under the <em>Tests</em> tab.
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="block mb-1">Name Test</span>
            <input
              type="text"
              className="w-full rounded border p-2"
              placeholder="e.g. Team Puzzle — Sales intake"
              value={testDisplayName}
              onChange={(e) => setTestDisplayName(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="block mb-1">Contact owner's name</span>
            <input
              type="text"
              className="w-full rounded border p-2"
              placeholder="e.g. Sarah Ndlovu"
              value={contactOwner}
              onChange={(e) => setContactOwner(e.target.value)}
            />
          </label>

          {/* Recipient email + toggle */}
          <label className="block text-sm">
            <span className="block mb-1">
              Recipient email (optional)
            </span>
            <input
              type="email"
              className="w-full rounded border p-2"
              placeholder="e.g. person@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
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
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
            />
            Show results to taker{" "}
            <span className="text-gray-500">
              after completion
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailReport}
              onChange={(e) => setEmailReport(e.target.checked)}
            />
            Email the report
          </label>

          {/* NEW: Only show when BOTH toggles are off */}
          {showHiddenMessageField && (
            <label className="block text-sm">
              <span className="block mb-1">
                Message to show instead of results
              </span>
              <textarea
                className="w-full rounded border p-2 min-h-[80px]"
                placeholder="e.g. Thank you for completing this assessment. Your facilitator will share your insights during the upcoming workshop."
                value={hiddenResultsMessage}
                onChange={(e) => setHiddenResultsMessage(e.target.value)}
              />
              <span className="text-xs text-gray-500">
                This message will be shown to the test taker when they
                complete the test instead of their results.
              </span>
            </label>
          )}

          <label className="block text-sm">
            <span className="block mb-1">Expiry (optional)</span>
            <input
              type="datetime-local"
              className="w-full rounded border p-2"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <span className="text-xs text-gray-500">
              If left blank, the link never expires.
            </span>
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={generate}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 w-full"
          >
            {loading ? "Generating..." : "Generate link"}
          </button>

          {status && (
            <p className="text-sm mt-2 text-gray-700">{status}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            Recent links — {orgName}
          </h2>
          <button
            type="button"
            onClick={refreshLinks}
            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
            disabled={loadingLinks}
            title="Reload"
          >
            {loadingLinks ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  Test
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Created
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Results
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Expiry
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Link
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Copy
                </th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-gray-500"
                  >
                    No links yet.
                  </td>
                </tr>
              )}
              {links.map((r) => {
                const url = fullLink(r.token);
                const expired = r.expires_at
                  ? new Date(r.expires_at) < new Date()
                  : false;
                return (
                  <tr key={r.token} className="border-t">
                    <td className="px-3 py-2">{r.test_name}</td>
                    <td className="px-3 py-2">
                      {r.created_at
                        ? new Date(
                            r.created_at
                          ).toLocaleString()
                        : "—"}
                      {!r.is_active && (
                        <span className="ml-2 text-xs text-gray-500">
                          (inactive)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.show_results ? "Shown" : "Hidden"}
                    </td>
                    <td className="px-3 py-2">
                      {r.expires_at
                        ? `${new Date(
                            r.expires_at
                          ).toLocaleString()}${
                            expired ? " (expired)" : ""
                          }`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          doCopy(url, "URL copied")
                        }
                        className="underline text-blue-600"
                      >
                        /t/{r.token}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() =>
                            doCopy(url, "URL copied")
                          }
                        >
                          URL
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() =>
                            doCopy(
                              embedCode(url),
                              "Embed copied"
                            )
                          }
                        >
                          Embed
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() =>
                            doCopy(
                              htmlButton(url),
                              "Snippet copied"
                            )
                          }
                        >
                          Snippet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {status && (
          <p className="text-xs text-gray-500 mt-3">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

