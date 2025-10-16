"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/* Types for the generated draft */
type DraftPayload = {
  profile: { name: string; frequency: "A" | "B" | "C" | "D" };
  meta: { brandTone: string; industry: string; sector: string; company: string };
  sections: {
    intro: string;
    how_to_use: string;
    core_overview: string;
    ideal_env: string;
    strengths: string;   // newline list
    challenges: string;
    ideal_roles: string;
    guidance: string;
    examples: string;    // bullet list text
    additional: string;
  };
};

export default function EditorClient() {
  const router = useRouter();
  const sp = useSearchParams(); // ✅ now safely inside Suspense

  const initialName = sp.get("name") || "";
  const initialFreq = (sp.get("frequency") || "A").toUpperCase() as
    | "A"
    | "B"
    | "C"
    | "D";

  const [name, setName] = useState(initialName);
  const [frequency, setFrequency] = useState<"A" | "B" | "C" | "D">(initialFreq);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [draft, setDraft] = useState<DraftPayload | null>(null);

  useEffect(() => {
    setName(initialName);
    setFrequency(initialFreq);
  }, [initialName, initialFreq]);

  const canGenerate = useMemo(
    () => !!name && ["A", "B", "C", "D"].includes(frequency) && !busy,
    [name, frequency, busy]
  );

  const generate = async () => {
    setBusy(true);
    setErr("");
    setDraft(null);
    try {
      const res = await fetch("/api/admin/profiles/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, frequency }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setDraft(j as DraftPayload);
    } catch (e: any) {
      setErr(e?.message || "Failed to generate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-6 text-white">
      <h1 className="text-4xl font-bold tracking-tight">Profile Editor</h1>
      <p className="text-white/70 mt-2">
        Generate and edit content for the selected profile.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm mb-1 text-white/80">Profile name</span>
          <input
            className="w-full rounded-xl bg-white text-black p-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name…"
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1 text-white/80">Frequency</span>
          <input
            className="w-full rounded-xl bg-white text-black p-3"
            value={frequency}
            onChange={(e) =>
              setFrequency(
                (e.target.value?.toUpperCase() as "A" | "B" | "C" | "D") || "A"
              )
            }
            placeholder="A / B / C / D"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20"
          onClick={() => router.back()}
        >
          Back
        </button>
        <button
          className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60"
          onClick={generate}
          disabled={!canGenerate}
        >
          {busy ? "Generating…" : "Generate Draft"}
        </button>
      </div>

      {err && (
        <div className="mt-6 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100">
          {err}
        </div>
      )}

      {draft && <DraftSections draft={draft} />}
    </main>
  );
}

function DraftSections({ draft }: { draft: DraftPayload }) {
  const router = useRouter();
  return (
    <section className="mt-10 space-y-8">
      <div className="text-sm text-white/60">
        Tone: <span className="text-white">{draft.meta.brandTone}</span> •
        Industry: <span className="text-white">{draft.meta.industry}</span> /{" "}
        <span className="text-white">{draft.meta.sector}</span> • Company:{" "}
        <span className="text-white">{draft.meta.company}</span>
      </div>

      <EditorBlock title="Section 1 · Welcome / Introduction" value={draft.sections.intro} />
      <EditorBlock title="Section 2 · How to use the report" value={draft.sections.how_to_use} />
      <EditorBlock title="Section 3 · Core Overview" value={draft.sections.core_overview} />
      <EditorBlock title="Section 4 · Ideal Environment" value={draft.sections.ideal_env} />
      <EditorBlock title="Section 5 · Strengths (one per line)" value={draft.sections.strengths} mono />
      <EditorBlock title="Section 6 · Challenges" value={draft.sections.challenges} />
      <EditorBlock title="Section 7 · Ideal Roles" value={draft.sections.ideal_roles} />
      <EditorBlock title="Section 8 · Guidance" value={draft.sections.guidance} />
      <EditorBlock title="Section 9 · Real-World Examples (two bullets)" value={draft.sections.examples} mono />
      <EditorBlock title="Section 10 · Additional Information" value={draft.sections.additional} />

      <div className="pt-4 flex gap-3">
        <button
          className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600"
          onClick={() => alert("Saved. (Wire DB persistence when ready.)")}
        >
          Save, Preview & Sign-off
        </button>
        <button
          className="px-5 py-2 rounded-xl bg-white/10"
          onClick={() => router.push("/admin/framework")}
        >
          Back to Framework
        </button>
      </div>
    </section>
  );
}

function EditorBlock({
  title,
  value,
  mono = false,
}: {
  title: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="font-semibold mb-2">{title}</div>
      <textarea
        className={`w-full rounded-lg bg-white text-black p-3 min-h-[120px] ${
          mono ? "font-mono" : ""
        }`}
        defaultValue={value}
      />
    </div>
  );
}
