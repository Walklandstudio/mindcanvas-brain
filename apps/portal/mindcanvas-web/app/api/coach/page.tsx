// app/coach/page.tsx

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const initialId =
    typeof sp.submissionId === "string" ? sp.submissionId : "";

  return <CoachClient initialId={initialId} />;
}

"use client";

import { useState } from "react";

type ProfileContent = {
  key?: string | null;
  name?: string | null;
  frequency?: string | null;
  strengths?: string[];
  watchouts?: string[];
  tips?: string[];
  raw?: unknown;
} | null;

type CoachResponse = {
  ok?: boolean;
  error?: string;
  needsResult?: boolean;
  frequency?: string | null;
  profile?: string | null;
  profileContent?: ProfileContent;
  advice?: string[];
};

function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      <div className="rounded-xl border p-3">{children}</div>
    </section>
  );
}

function List({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-gray-500">—</p>;
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((t, i) => (
        <li key={i} className="text-sm">{t}</li>
      ))}
    </ul>
  );
}

function CoachClient({ initialId = "" }: { initialId?: string }) {
  const [submissionId, setSubmissionId] = useState<string>(initialId);
  const [message, setMessage] = useState<string>("How should I run my weekly standup?");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<CoachResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setErr(null);
    setResp(null);
    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, message }),
      });
      const json = (await r.json()) as CoachResponse;
      if (!r.ok) setErr(json.error ?? "Coach error");
      setResp(json);
    } catch (e) {
      setErr("Network error contacting /api/coach");
    } finally {
      setLoading(false);
    }
  }

  async function useLatest() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/submissions/recent?limit=1", { cache: "no-store" });
      const j = (await r.json()) as { ok?: boolean; rows?: Array<{ submission_id: string }> };
      const id = j?.rows?.[0]?.submission_id;
      if (isNonEmpty(id)) {
        setSubmissionId(id);
      } else {
        setErr("No submissions found. Run a test first.");
      }
    } catch {
      setErr("Could not fetch recent submissions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Competency Coach</h1>
        <p className="text-sm text-gray-600">
          Paste a <code>submissionId</code> (e.g. from <a className="underline" href="/api/submissions/recent?limit=20" target="_blank">recent</a>) or click “Use latest”.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Submission ID (UUID)"
          value={submissionId}
          onChange={(e) => setSubmissionId(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={useLatest}
            className="border rounded-lg px-3 py-2"
            disabled={loading}
          >
            Use latest
          </button>
          <button
            onClick={ask}
            className="border rounded-lg px-3 py-2"
            disabled={loading || !isNonEmpty(submissionId)}
          >
            {loading ? "Thinking…" : "Ask Coach"}
          </button>
        </div>
      </div>

      <input
        className="border rounded-lg px-3 py-2 w-full"
        placeholder="Ask the coach…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" ? ask() : undefined}
      />

      {err && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {resp && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge>{resp.needsResult ? "needsResult: true" : "needsResult: false"}</Badge>
            {isNonEmpty(resp.frequency) && <Badge>Frequency: {resp.frequency}</Badge>}
            {isNonEmpty(resp.profile) && <Badge>Profile: {resp.profile}</Badge>}
          </div>

          {resp.profileContent && (
            <Section title="Profile">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isNonEmpty(resp.profileContent.name) && (
                    <span className="font-medium">{resp.profileContent.name}</span>
                  )}
                  {isNonEmpty(resp.profileContent.frequency) && (
                    <Badge>{resp.profileContent.frequency}</Badge>
                  )}
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500">Strengths</h3>
                    <List items={resp.profileContent.strengths} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500">Watch-outs</h3>
                    <List items={resp.profileContent.watchouts} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500">Tips</h3>
                    <List items={resp.profileContent.tips} />
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Section title="Coach Advice">
            <List items={resp.advice} />
          </Section>

          <Section title="Raw Response">
            <pre className="whitespace-pre-wrap text-xs">
{JSON.stringify(resp, null, 2)}
            </pre>
          </Section>
        </div>
      )}
    </main>
  );
}
