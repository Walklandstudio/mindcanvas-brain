'use client';

import { useState } from 'react';
import { postJSON } from '@/lib/api';

type CreateLinkResponse =
  | { ok: true; link_id: string; link_url?: string; token?: string }
  | { ok: false; error: string };

type Props = {
  defaultOrgId?: string;
  defaultTestId?: string;
};

export default function LinkCreateForm({ defaultOrgId = '', defaultTestId = '' }: Props) {
  const [orgId, setOrgId] = useState(defaultOrgId);
  const [testId, setTestId] = useState(defaultTestId);
  const [testType, setTestType] = useState<'free' | 'paid' | ''>('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [showResults, setShowResults] = useState(true);
  const [sendReport, setSendReport] = useState(false);
  const [revealToken, setRevealToken] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [maxUses, setMaxUses] = useState<number>(1);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const [toEmail, setToEmail] = useState('');
  const [toName, setToName] = useState('');
  const [emailing, setEmailing] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setLinkId(null);
    setLinkUrl(null);
    try {
      const payload: any = {
        org_id: orgId.trim(),
        test_id: testId.trim(),
        name: name.trim() || null,
        reason: reason.trim() || null,
        send_report: !!sendReport,
        show_results: !!showResults,
        max_uses: Number(maxUses) || 1,
        reveal_token: !!revealToken,
      };
      if (testType) payload.test_type = testType;
      if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();

      const res = await postJSON<CreateLinkResponse>('/api/links', payload);
      if ('ok' in res && res.ok) {
        setLinkId(res.link_id);
        setLinkUrl((res as any).link_url || null);
      } else {
        setCreateError((res as any)?.error || 'Create failed');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!linkId) {
      setEmailMsg('Generate a link first.');
      return;
    }
    setEmailing(true);
    setEmailMsg(null);
    try {
      const res = await postJSON<{ ok: true; id: string } | { ok: false; error: string }>(
        `/api/links/${linkId}/email`,
        { toEmail: toEmail.trim(), toName: toName.trim() || undefined }
      );
      if ('ok' in res && res.ok) setEmailMsg('Email sent ✔');
      else setEmailMsg((res as any)?.error || 'Email failed');
    } catch (err: any) {
      setEmailMsg(err?.message || 'Email failed');
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Retrieve Tokens & Profiles</h1>
        <p className="text-sm text-gray-600">
          Generate a test link without exposing the token on-screen. Optionally email it to a recipient.
        </p>
      </div>

      <form onSubmit={onCreate} className="grid gap-4 rounded-2xl border p-4">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Organisation ID (uuid)</label>
          <input
            className="rounded-md border px-3 py-2"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Test ID (uuid)</label>
          <input
            className="rounded-md border px-3 py-2"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Test Type</label>
            <select
              className="rounded-md border px-3 py-2"
              value={testType}
              onChange={(e) => setTestType(e.target.value as any)}
            >
              <option value="">(not set)</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Max uses</label>
            <input
              type="number"
              min={1}
              className="rounded-md border px-3 py-2"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value || '1', 10))}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Expires at (optional)</label>
            <input
              type="datetime-local"
              className="rounded-md border px-3 py-2"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Name (admin only)</label>
            <input
              className="rounded-md border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cohort A – Q4 intake"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Reason (admin only)</label>
            <input
              className="rounded-md border px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pilot invite / Hiring batch"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
            />
            Show results to taker
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendReport}
              onChange={(e) => setSendReport(e.target.checked)}
            />
            Email report to taker (after completion)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={revealToken}
              onChange={(e) => setRevealToken(e.target.checked)}
            />
            Reveal token in response (admin only)
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={creating}
            className="rounded-md border px-4 py-2"
          >
            {creating ? 'Creating…' : 'Create link'}
          </button>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
        </div>

        {linkId && (
          <div className="rounded-lg border p-3 bg-gray-50">
            <div className="text-sm">Link created ✔</div>
            <div className="text-xs text-gray-600 break-all">link_id: {linkId}</div>
            {linkUrl && (
              <div className="text-xs text-gray-600 break-all">
                link_url (revealed): <a className="underline" href={linkUrl}>{linkUrl}</a>
              </div>
            )}
          </div>
        )}
      </form>

      <form onSubmit={onEmail} className="grid gap-4 rounded-2xl border p-4">
        <div className="space-y-1">
          <div className="text-base font-medium">Send link via email</div>
          <p className="text-sm text-gray-600">
            Generate a link first, then email it to a recipient. The token is only embedded in the email URL.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Recipient email</label>
            <input
              className="rounded-md border px-3 py-2"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="person@example.com"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Recipient name (optional)</label>
            <input
              className="rounded-md border px-3 py-2"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!linkId || emailing}
            className="rounded-md border px-4 py-2"
          >
            {emailing ? 'Sending…' : 'Send email'}
          </button>
          {emailMsg && <p className="text-sm">{emailMsg}</p>}
        </div>
      </form>
    </div>
  );
}
