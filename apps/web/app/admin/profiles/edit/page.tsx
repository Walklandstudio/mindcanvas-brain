"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

type DraftSections = {
  meta?: any;
  welcome?: string;
  how_to_use?: string;
  core_overview?: { profile_in_depth?: string; frequency_label?: string; summary?: string };
  ideal_environment?: string;
  strengths?: string[] | string;
  challenges?: string;
  ideal_roles?: string;
  guidance?: string;
  real_world_examples?: string;
  additional_info?: string;
};

export default function ProfileEditorPage() {
  const params = useSearchParams();
  const router = useRouter();

  const name = params.get("name") || "";
  const frequency = params.get("frequency") || "";

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<DraftSections | null>(null);

  /** Generate draft from API */
  async function generate() {
    setErr("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profiles/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          frequency,
        }),
      });

      // Safely handle empty/non-JSON responses
      const text = await res.text();
      const j = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to generate draft");
    } finally {
      setSaving(false);
    }
  }

  /** Save + preview (currently just mock redirect to preview page) */
  async function savePreview() {
    alert("Saved. (Wire up DB persistence and redirect when ready.)");
    router.push(`/admin/profiles/preview?name=${name}&frequency=${frequency}`);
  }

  return (
    <main className="max-w-4xl mx-auto p-8 text-white">
      <h1 className="text-3xl font-semibold mb-2">Profile Editor</h1>
      <p className="text-white/60 mb-6">
        Generate and edit content for the selected profile.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <label className="block">
          <span className="text-sm text-white/70">Profile name</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={name}
            readOnly
          />
        </label>
        <label className="block">
          <span className="text-sm text-white/70">Frequency</span>
          <input
            className="w-full rounded-lg bg-white text-black p-3"
            value={frequency}
            readOnly
          />
        </label>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => router.push("/admin/framework")}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20"
        >
          Back
        </button>
        <button
          onClick={generate}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-medium disabled:opacity-60"
        >
          {saving ? "Generating…" : "Generate Draft"}
        </button>
      </div>

      {err && (
        <div className="bg-red-900/40 border border-red-800 text-red-200 p-4 rounded-lg mb-6">
          {err}
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-2">Section 1 · Welcome / Introduction</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.welcome || ""}
              onChange={(e) => setData((d) => d && { ...d, welcome: e.target.value })}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 2 · How to Use the Report</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.how_to_use || ""}
              onChange={(e) => setData((d) => d && { ...d, how_to_use: e.target.value })}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 3 · Core Overview</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.core_overview?.summary || ""}
              onChange={(e) =>
                setData(
                  (d) =>
                    d && {
                      ...d,
                      core_overview: {
                        ...d.core_overview,
                        summary: e.target.value,
                      },
                    }
                )
              }
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 4 · Ideal Environment</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.ideal_environment || ""}
              onChange={(e) => setData((d) => d && { ...d, ideal_environment: e.target.value })}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 5 · Strengths</h2>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(data.strengths) ? data.strengths : [data.strengths || ""])
                .filter(Boolean)
                .map((s, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-cyan-800 rounded-lg text-sm text-white/90"
                  >
                    {s}
                  </span>
                ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 6 · Challenges</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.challenges || ""}
              onChange={(e) => setData((d) => d && { ...d, challenges: e.target.value })}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 7 · Ideal Roles</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.ideal_roles || ""}
              onChange={(e) => setData((d) => d && { ...d, ideal_roles: e.target.value })}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 8 · Guidance</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.guidance || ""}
              onChange={(e) => setData((d) => d && { ...d, guidance: e.target.value })}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 9 · Real-World Examples</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.real_world_examples || ""}
              onChange={(e) =>
                setData((d) => d && { ...d, real_world_examples: e.target.value })
              }
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Section 10 · Additional Information</h2>
            <textarea
              className="w-full p-3 rounded-lg bg-white text-black"
              rows={3}
              value={data.additional_info || ""}
              onChange={(e) =>
                setData((d) => d && { ...d, additional_info: e.target.value })
              }
            />
          </section>

          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={savePreview}
              className="rounded-xl px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              Save, Preview & Sign-off
            </button>
            <button
              onClick={() => router.push("/admin/framework")}
              className="rounded-xl px-5 py-3 bg-white/10 border border-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
