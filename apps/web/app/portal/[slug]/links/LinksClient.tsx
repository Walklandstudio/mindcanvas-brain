"use client";

import { useEffect, useMemo, useState } from "react";

type Test = { id: string; name: string; test_type?: string | null; is_active?: boolean | null };
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

export default function LinksClient(props: { orgId: string; orgSlug: string; orgName: string }) {
  const { orgId, orgSlug, orgName } = props;

  const [tests, setTests] = useState<Test[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  const [testId, setTestId] = useState("");
  const [testDisplayName, setTestDisplayName] = useState("");
  const [contactOwner, setContactOwner] = useState("");
  const [showResults, setShowResults] = useState(true);
  const [emailReport, setEmailReport] = useState(true);
  const [message, setMessage] = useState("Thank you for taking the test. Your facilitator will follow up with next steps.");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // load tests
  useEffect(() => {
    fetch(`/api/admin/tests?orgId=${orgId}`)
      .then(r => r.json())
      .then(d => setTests(Array.isArray(d) ? d : []))
      .catch(() => setTests([]));
  }, [orgId]);

  // load links
  const refreshLinks = () => {
    fetch(`/api/admin/links?orgId=${orgId}`)
      .then(r => r.json())
      .then(rows => setLinks(Array.isArray(rows) ? rows : []))
      .catch(() => setLinks([]));
  };
  useEffect(() => { refreshLinks(); }, [orgId]);

  // helpers
  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    return `${u.protocol}//${u.host}`;
  }, []);
  const fullLink = (token: string) => `${baseUrl}/t/${token}`;

  const doCopy = async (text: string, label = "Link copied!") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setStatus("Clipboard failed. Please copy manually.");
    }
  };

  const generate = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        orgId,
        testId,
        testDisplayName: testDisplayName || null,
        contactOwner: contactOwner || null,
        showResults,
        emailReport,
        hiddenResultsMessage: showResults ? null : (message || null),
        redirectUrl: showResults ? null : (redirectUrl || null),
        expiresAt: expiresAt || null,
      };

      const res = await fetch("/api/admin/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.ok) {
        setStatus(`Error: ${data.error || "unknown"}`);
      } else {
        await doCopy(data.url as string, "New link copied!");
        setTestDisplayName("");
        setContactOwner("");
        if (!showResults) {
          setMessage("Thank you for taking the test. Your facilitator will follow up with next steps.");
          setRedirectUrl("");
        }
        refreshLinks();
      }
    } catch (e: any) {
      setStatus(e?.message || "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Generate Test Link</h1>
          <p className="text-sm text-gray-600">
            Generate a test link. Optionally email it to a recipient.
          </p>
        </div>
        {copied && (
          <span className="rounded-md bg-green-100 text-green-800 text-xs px-2 py-1">
            {copied}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Form */}
        <div className="space-y-3 rounded-xl border p-4 bg-white">
          {/* Select test */}
          <label className="text-sm block">
            <span className="mb-1 block">Select test</span>
            <select
              className="w-full rounded border p-2"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
            >
              <option value="">Select test…</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.test_type ? ` (${t.test_type})` : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Name Test */}
          <label className="text-sm block">
            <span className="mb-1 block">Name Test</span>
            <input
              className="w-full rounded border p-2"
              value={testDisplayName}
              onChange={(e) => setTestDisplayName(e.target.value)}
              placeholder="e.g. Team Puzzle Profile — Sales intake"
            />
          </label>

          {/* Contact owner */}
          <label className="text-sm block">
            <span className="mb-1 block">Contact owner&apos;s name</span>
            <input
              className="w-full rounded border p-2"
              value={contactOwner}
              onChange={(e) => setContactOwner(e.target.value)}
              placeholder="e.g. Sarah Ndlovu"
            />
          </label>

          {/* Show results */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showResults}
              onChange={() => setShowResults(v => !v)}
            />
            Show results to taker <span className="text-gray-500">after completion</span>
          </label>

          {/* Hidden-results config */}
          {!showResults && (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">
                  Thank you / next steps message (shown after completion)
                </span>
                <textarea
                  rows={4}
                  className="w-full rounded border p-2"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Thank you for taking the test. We’ll be in touch with your next steps."
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">Redirect URL (optional)</span>
                <input
                  className="w-full rounded border p-2"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://example.com/next-steps"
                />
              </label>
            </div>
          )}

          {/* Email report */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailReport}
              onChange={() => setEmailReport(v => !v)}
            />
            Email the report
          </label>

          {/* Optional expiry */}
          <label className="text-sm block">
            <span className="mb-1 block">Expiry (optional)</span>
            <input
              type="datetime-local"
              className="w-full rounded border p-2"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <span className="block mt-1 text-xs text-gray-500">
              If left blank, the link never expires.
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              className="rounded bg-black px-3 py-2 text-white text-sm disabled:opacity-50"
              disabled={!testId || loading}
              onClick={generate}
            >
              {loading ? "Generating…" : "Generate link"}
            </button>
            {status && <span className="text-sm text-red-600">{status}</span>}
          </div>
        </div>

        {/* Existing links */}
        <div className="rounded-xl border p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Recent links — {orgName}</h2>
            <button
              onClick={refreshLinks}
              className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Test</th>
                  <th className="px-3 py-2 text-left font-medium">Created</th>
                  <th className="px-3 py-2 text-left font-medium">Results</th>
                  <th className="px-3 py-2 text-left font-medium">Expiry</th>
                  <th className="px-3 py-2 text-left font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {links.map((r) => {
                  const url = fullLink(r.token);
                  const expired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
                  return (
                    <tr key={r.token} className="border-t">
                      <td className="px-3 py-2">
                        {r.test_name}
                        {r.contact_owner && <span className="ml-2 text-xs text-gray-500">({r.contact_owner})</span>}
                      </td>
                      <td className="px-3 py-2">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                        {!r.is_active && <span className="ml-2 text-xs text-gray-500">(inactive)</span>}
                      </td>
                      <td className="px-3 py-2">{r.show_results ? "Shown" : "Hidden"}</td>
                      <td className="px-3 py-2">
                        {r.expires_at
                          ? `${new Date(r.expires_at).toLocaleString()}${expired ? " (expired)" : ""}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => doCopy(url)}
                          className="underline"
                          title="Copy link"
                        >
                          /t/{r.token}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!links.length && (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                      No links yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-3">Path: /portal/{orgSlug}/links</p>
        </div>
      </div>
    </div>
  );
}
