// app/test/[slug]/TestClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Prefill = {
  first?: string;
  last?: string;
  name?: string;  // if provided, we’ll split to first/last once
  email?: string;
  phone?: string;
};

type Props = {
  slug: string;
  initialSid?: string;         // may be undefined — we’ll auto-create
  prefill?: Prefill;
};

export default function TestClient({ slug, initialSid, prefill }: Props) {
  // ---- person fields
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // ---- submission id
  const [sid, setSid] = useState<string | undefined>(initialSid);
  const [starting, setStarting] = useState(false);

  // ---- ui
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);

  // one-time split if name is passed
  useEffect(() => {
    if (prefill?.name && !prefill.first && !prefill.last) {
      const parts = prefill.name.trim().split(/\s+/);
      const f = parts.shift() ?? "";
      const l = parts.join(" ");
      setFirst((v) => v || f);
      setLast((v) => v || l);
    } else {
      if (prefill?.first) setFirst((v) => v || prefill.first!);
      if (prefill?.last) setLast((v) => v || prefill.last!);
    }
    if (prefill?.email) setEmail((v) => v || prefill.email!);
    if (prefill?.phone) setPhone((v) => v || prefill.phone!);
  }, [prefill]);

  // Auto-start a submission if there is no sid in the URL.
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setStarting(true);
        setSaveErr(null);

        // POST /api/submissions/start { slug }
        const res = await fetch("/api/submissions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });

        const text = await res.text();
        if (!res.ok) throw new Error(text);

        const data = JSON.parse(text) as {
          submissionId: string;
          testSlug: string;
        };

        if (!cancelled) setSid(data.submissionId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("start submission failed:", msg);
        if (!cancelled) setSaveErr(`Failed to start: ${msg}`);
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    if (!sid) start();

    return () => {
      cancelled = true;
    };
  }, [sid, slug]);

  async function onSaveDetails() {
    try {
      setSaveBusy(true);
      setSaveErr(null);

      if (!sid) throw new Error("Submission ID missing (sid).");

      // minimal validation
      if (!first || !last || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("Please enter first name, last name, and a valid email.");
      }

      const res = await fetch(`/api/submissions/${sid}/person`, {
        method: "POST", // our API implements POST to set/merge details
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          email,
          phone,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text);

      setSavedOnce(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("save details error:", msg);
      setSaveErr(msg);
      setSavedOnce(false);
    } finally {
      setSaveBusy(false);
    }
  }

  // You already have your questions UI; this file just ensures "sid" exists and saving works.
  // Below is a very small shell for the header/controls so you can drop in.

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {saveErr && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          Failed to save details: {saveErr}
        </div>
      )}

      <section className="rounded border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your details</h2>
          <span className="text-xs text-zinc-500">
            {starting ? "Starting…" : sid ? "Ready" : "No submission yet"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded border px-3 py-2"
            placeholder="First name"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            disabled={starting}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Last name"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            disabled={starting}
          />
          <input
            className="rounded border px-3 py-2 sm:col-span-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={starting}
          />
          <input
            className="rounded border px-3 py-2 sm:col-span-2"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={starting}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={onSaveDetails}
            disabled={starting || !sid || saveBusy}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saveBusy ? "Saving…" : "Save details"}
          </button>
          {savedOnce && <span className="text-sm text-emerald-700">Saved</span>}
        </div>

        <p className="mt-3 text-sm text-zinc-500">
          We use this to attach your report and let you revisit it later.
        </p>
      </section>

      {/* Your questions UI sits below; it should also gate “Next” on sid being present */}
      {/* ... */}
    </div>
  );
}

