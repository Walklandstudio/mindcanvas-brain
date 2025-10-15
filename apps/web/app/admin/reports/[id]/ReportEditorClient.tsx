"use client";

import { useState } from "react";

type Sections = {
  summary?: string;
  strengths?: string;
  challenges?: string;
  roles?: string;
  guidance?: string;
};

export default function ReportEditorClient(props: {
  orgId: string;
  frameworkId: string | null;
  profile: { id: string; name: string; frequency: "A"|"B"|"C"|"D"; image_url: string | null };
  frequencyNames: Record<"A"|"B"|"C"|"D", string> | null;
  initialSections: Sections;
  initialApproved: boolean;
}) {
  const [sections, setSections] = useState<Sections>(props.initialSections ?? {});
  const [approved, setApproved] = useState<boolean>(props.initialApproved);
  const [busy, setBusy] = useState<string | null>(null);
  const freqLabel = props.frequencyNames?.[props.profile.frequency] ?? props.profile.frequency;

  function textArea(
    label: string,
    key: keyof Sections,
    placeholder: string
  ) {
    return (
      <label className="block">
        <div className="text-sm text-white/70 mb-1">{label}</div>
        <textarea
          className="w-full rounded-xl bg-white text-black px-3 py-2 min-h-28"
          placeholder={placeholder}
          value={(sections[key] as string) ?? ""}
          onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
          disabled={approved}
        />
      </label>
    );
  }

  async function call(op: "draft" | "save" | "approve") {
    setBusy(op);
    try {
      const res = await fetch(`/api/admin/reports/${props.profile.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op,
          sections: op === "draft" ? undefined : sections,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Request failed");

      // server returns new sections/approved on success
      if (json.sections) setSections(json.sections);
      if (typeof json.approved === "boolean") setApproved(json.approved);
    } catch (e: any) {
      alert(e?.message || "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {props.profile.image_url ? (
            <img
              src={props.profile.image_url}
              alt={props.profile.name}
              className="object-cover h-12 w-12"
            />
          ) : (
            <span className="text-white/40 text-xs">no image</span>
          )}
        </div>
        <div>
          <div className="text-lg font-semibold">{props.profile.name}</div>
          <div className="text-sm text-white/70">
            {props.profile.frequency} · {freqLabel}
          </div>
        </div>
        {approved && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200">
            Approved
          </span>
        )}
      </div>

      <div className="grid gap-4">
        {textArea("Summary (1–2 lines)", "summary", "Concise blurb for the index card…")}
        {textArea("Strengths (2 short paragraphs)", "strengths", "…")}
        {textArea("Challenges (2 short paragraphs)", "challenges", "…")}
        {textArea("Ideal Roles (1–2 short paragraphs)", "roles", "…")}
        {textArea("Guidance (2 short paragraphs)", "guidance", "…")}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => call("draft")}
          disabled={!!busy || approved}
          className="mc-btn-ghost"
        >
          {busy === "draft" ? "Drafting…" : "Use AI → Draft"}
        </button>

        <button
          onClick={() => call("save")}
          disabled={!!busy || approved}
          className="mc-btn-ghost"
        >
          {busy === "save" ? "Saving…" : "Save Draft"}
        </button>

        <button
          onClick={() => call("approve")}
          disabled={!!busy || approved}
          className="mc-btn-primary"
        >
          {busy === "approve" ? "Locking…" : "Approve & Lock"}
        </button>
      </div>
    </div>
  );
}
