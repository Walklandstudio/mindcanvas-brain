// app/test/[slug]/TestClient.tsx
"use client";

import { useCallback, useMemo, useState } from "react";

type Prefill = {
  name?: string;
  email?: string;
  phone?: string;
};

type Props = {
  slug: string;
  sid?: string;            // submission id (if present in URL)
  prefill?: Prefill;       // optional prefill from URL
};

export default function TestClient({ slug, sid, prefill }: Props) {
  // split name into first/last (super simple split – adjust if you like)
  const [first, setFirst] = useState<string>(() => prefill?.name?.split(" ")?.[0] ?? "");
  const [last, setLast]   = useState<string>(() => {
    const parts = (prefill?.name ?? "").trim().split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  });
  const [email, setEmail] = useState<string>(prefill?.email ?? "");
  const [phone, setPhone] = useState<string>(prefill?.phone ?? "");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<null | { kind: "ok" | "err"; text: string }>(null);

  const submissionId = useMemo(() => sid ?? "", [sid]);

  const saveDetails = useCallback(async () => {
    setSaveMsg(null);

    if (!submissionId) {
      setSaveMsg({ kind: "err", text: "No submission id – refresh or start the test again." });
      return;
    }

    // naive validation
    if (!first || !last || !email || !phone) {
      setSaveMsg({ kind: "err", text: "Please fill in first name, last name, email and phone." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/person`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          email,
          phone,
          // optional: attach slug so the backend can double-check
          test_slug: slug,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `HTTP ${res.status}`);
      }

      setSaveMsg({ kind: "ok", text: "Saved ✔" });
    } catch (e: any) {
      setSaveMsg({ kind: "err", text: `Failed to save details: ${e?.message ?? e}` });
    } finally {
      setSaving(false);
    }
  }, [email, first, last, phone, slug, submissionId]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Competency Coach — Profile Test</h1>

      {saveMsg && (
        <div
          className={`mb-4 rounded border px-3 py-2 text-sm ${
            saveMsg.kind === "ok"
              ? "border-green-400 bg-green-50 text-green-800"
              : "border-red-400 bg-red-50 text-red-800"
          }`}
        >
          {saveMsg.text}
        </div>
      )}

      <section className="rounded border p-4 mb-6">
        <h2 className="font-medium mb-3">Your details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="First name"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Last name"
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <button
            onClick={saveDetails}
            disabled={saving}
            className="inline-flex items-center rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </div>
      </section>

      {/* Your question UI goes here; this file focuses on fixing details-save + import */}
      <p className="text-sm text-gray-500">
        Submission: {submissionId ? submissionId : "(not set yet)"}
      </p>
    </div>
  );
}

