"use client";

import { useEffect, useState } from "react";

type Draft = {
  intro: string;
  howTo: string;
  coreOverview: { profileInDepth: string; frequencyName: string };
  idealEnvironment: string;
  strengths: string[];
  challenges: string[];
  idealRoles: string;
  guidance: string;
  realWorldExamples: string[];
  additionalInfo: string;
};

export default function ProfileEdit() {
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

  // ✅ Define frequency FIRST so it exists in scope for any later usage
  const [frequency, setFrequency] = useState<"A" | "B" | "C" | "D">(
    (params.get("frequency") as "A" | "B" | "C" | "D") || "A"
  );

  const [name, setName] = useState(params.get("name") || "Profile");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // ✅ Define draft state locally (no top-level `draft` symbol)
  const [draft, setDraft] = useState<Draft>({
    intro: "",
    howTo: "",
    coreOverview: { profileInDepth: "", frequencyName: `Frequency ${frequency}` },
    idealEnvironment: "",
    strengths: [],
    challenges: [],
    idealRoles: "",
    guidance: "",
    realWorldExamples: ["", ""],
    additionalInfo: "",
  });

  async function generate() {
    try {
      setLoading(true);
      setErr("");

      const gRes = await fetch("/api/onboarding/get?step=goals", { cache: "no-store" });
      const goals = (await gRes.json().catch(() => ({})))?.data || {};

      const res = await fetch("/api/admin/profiles/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: "Your Organization",
          goals,
          profileName: name,
          frequencyName: `Frequency ${frequency}`,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Generation failed");

      setDraft({
        intro: j.intro || "",
        howTo: j.howTo || "",
        coreOverview: {
          profileInDepth: j?.coreOverview?.profileInDepth || "",
          frequencyName: j?.coreOverview?.frequencyName || `Frequency ${frequency}`,
        },
        idealEnvironment: j.idealEnvironment || "",
        strengths: Array.isArray(j.strengths) ? j.strengths : [],
        challenges: Array.isArray(j.challenges) ? j.challenges : [],
        idealRoles: j.idealRoles || "",
        guidance: j.guidance || "",
        realWorldExamples: Array.isArray(j.realWorldExamples)
          ? j.realWorldExamples.slice(0, 2).concat(["", ""]).slice(0, 2)
          : ["", ""],
        additionalInfo: j.additionalInfo || "",
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function saveAndPreview() {
    try {
      const orgId = (typeof window !== "undefined" && localStorage.getItem("mc_org_id")) || null;

      const res = await fetch("/api/admin/profiles/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ All identifiers are in scope; explicit object is fine
        body: JSON.stringify({
          orgId,
          profileName: name,
          frequency: frequency,
          content: draft,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Save failed");

      window.location.href = `/admin/profiles/preview?id=${j.id}`;
    } catch (e: any) {
      alert(e?.message || "Save failed");
    }
  }

  const strengthsText = (draft.strengths || []).join("\n");
  const challengesText = (draft.challenges || []).join("\n");

  return (
    <main className="max-w-3xl mx-auto p-8 text-white">
      <h1 className="text-3xl font-semibold">Profile Editor</h1>
      <p className="text-white/60 mb-6">Generate and edit content for the selected profile.</p>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-white/60">Profile name</span>
          <input className="w-full rounded bg-white text-black p-3" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-white/60">Frequency</span>
          <input className="w-full rounded bg-white text-black p-3" value={frequency} readOnly />
        </label>
      </div>

      <div className="flex gap-3 mt-4">
        <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">
          Back
        </a>
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate Draft"}
        </button>
      </div>

      {err && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 text-sm">{err}</div>
      )}

      <div className="mt-8 grid gap-6">
        <EditorBlock
          title="Section 1 · Welcome / Introduction"
          value={draft.intro}
          rows={3}
          onChange={(v) => setDraft((d) => ({ ...d, intro: v }))}
        />
        <EditorBlock
          title="Section 2 · How to use the report"
          value={draft.howTo}
          rows={3}
          onChange={(v) => setDraft((d) => ({ ...d, howTo: v }))}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">Section 3 · Core Overview</h2>
          <div className="text-white/60 text-sm mt-2">Profile In Depth</div>
          <textarea
            className="w-full mt-1 p-3 rounded bg-white text-black"
            rows={4}
            value={draft.coreOverview.profileInDepth}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                coreOverview: { ...d.coreOverview, profileInDepth: e.target.value },
              }))
            }
          />
          <div className="text-white/60 text-sm mt-3">Frequency</div>
          <input
            className="w-full mt-1 p-3 rounded bg-white text-black"
            value={draft.coreOverview.frequencyName}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                coreOverview: { ...d.coreOverview, frequencyName: e.target.value },
              }))
            }
          />
        </div>

        <EditorBlock
          title="Section 4 · Ideal Environment"
          value={draft.idealEnvironment}
          rows={4}
          onChange={(v) => setDraft((d) => ({ ...d, idealEnvironment: v }))}
        />

        <EditorBlock
          title="Section 5 · Strengths (one per line)"
          value={strengthsText}
          rows={5}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              strengths: v
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
        />

        <EditorBlock
          title="Section 6 · Challenges (one per line)"
          value={challengesText}
          rows={5}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              challenges: v
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
        />

        <EditorBlock
          title="Section 7 · Ideal Roles"
          value={draft.idealRoles}
          rows={3}
          onChange={(v) => setDraft((d) => ({ ...d, idealRoles: v }))}
        />

        <EditorBlock
          title="Section 8 · Guidance"
          value={draft.guidance}
          rows={4}
          onChange={(v) => setDraft((d) => ({ ...d, guidance: v }))}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">Section 9 · Real-World Examples (AI provides 2)</h2>
          <input
            className="w-full mt-3 p-3 rounded bg-white text-black"
            placeholder="Example 1"
            value={draft.realWorldExamples[0] || ""}
            onChange={(e) =>
              setDraft((d) => {
                const arr = [...(d.realWorldExamples || ["", ""])];
                arr[0] = e.target.value;
                return { ...d, realWorldExamples: arr };
              })
            }
          />
          <input
            className="w-full mt-3 p-3 rounded bg-white text-black"
            placeholder="Example 2"
            value={draft.realWorldExamples[1] || ""}
            onChange={(e) =>
              setDraft((d) => {
                const arr = [...(d.realWorldExamples || ["", ""])];
                arr[1] = e.target.value;
                return { ...d, realWorldExamples: arr };
              })
            }
          />
        </div>

        <EditorBlock
          title="Section 10 · Additional Information"
          value={draft.additionalInfo}
          rows={3}
          onChange={(v) => setDraft((d) => ({ ...d, additionalInfo: v }))}
        />

        <div className="flex gap-3">
          <button
            onClick={saveAndPreview}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium"
          >
            Save, Preview & Sign-off
          </button>
          <a className="px-4 py-2 rounded-xl bg-white/10 border border-white/20" href="/admin/framework">
            Cancel
          </a>
        </div>
      </div>
    </main>
  );
}

function EditorBlock({
  title,
  value,
  onChange,
  rows = 3,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-medium">{title}</h2>
      <textarea
        className="w-full mt-2 p-3 rounded bg-white text-black"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
