"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ReportDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const search = useSearchParams();
  const orgId = search.get("orgId") ?? "";
  const frameworkId = search.get("frameworkId") ?? "";

  const [sections, setSections] = useState<any>({});
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !frameworkId) return;
    (async () => {
      const res = await fetch(
        `/api/admin/reports/${id}?orgId=${orgId}&frameworkId=${frameworkId}`
      );
      const j = await res.json();
      if (res.ok) {
        setSections(j.report?.sections ?? {});
        setApproved(!!j.report?.approved);
      }
      setLoading(false);
    })();
  }, [id, orgId, frameworkId]);

  const save = async (nextApproved?: boolean) => {
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        frameworkId,
        sections,
        approved: !!nextApproved,
      }),
    });
    const j = await res.json();
    if (!res.ok) return toast(j.error ?? "Save failed");
    if (typeof nextApproved === "boolean") setApproved(nextApproved);
    toast("Saved");
  };

  const useAIDraft = () => {
    const scaffold = {
      strengths: sections.strengths ?? "• Takes initiative\n• Collaborates effectively",
      challenges: sections.challenges ?? "• May rush planning\n• Needs clearer prioritization",
      ideal_roles: sections.ideal_roles ?? "• Team Lead\n• Project Catalyst",
      guidance: sections.guidance ?? "• Set weekly targets\n• Pair with detail-oriented partner",
    };
    setSections(scaffold);
    toast("Draft created");
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <main className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a
            className="text-sm text-gray-600 hover:underline"
            href={`/admin/reports?orgId=${orgId}&frameworkId=${frameworkId}`}
          >
            ← Back to Reports
          </a>
          <h1 className="text-2xl font-semibold mt-1">Report Editor</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={useAIDraft} className="btn-secondary">
            Use AI → Draft
          </button>
          <button onClick={() => save(false)} className="btn-secondary">
            Save Draft
          </button>
          <button onClick={() => save(true)} className="btn-primary">
            Approve &amp; Lock
          </button>
        </div>
      </div>

      <Editor
        sections={sections}
        setSections={setSections}
        disabled={approved}
      />

      {approved && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          Approved. Editing is locked; click “Save Draft” to create a new draft
          (will switch off Approved).
        </div>
      )}
    </main>
  );
}

function Editor({
  sections,
  setSections,
  disabled,
}: {
  sections: any;
  setSections: (s: any) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Field
        label="Strengths"
        value={sections.strengths}
        onChange={(v) => setSections({ ...sections, strengths: v })}
        disabled={disabled}
      />
      <Field
        label="Challenges"
        value={sections.challenges}
        onChange={(v) => setSections({ ...sections, challenges: v })}
        disabled={disabled}
      />
      <Field
        label="Ideal Roles"
        value={sections.ideal_roles}
        onChange={(v) => setSections({ ...sections, ideal_roles: v })}
        disabled={disabled}
      />
      <Field
        label="Guidance"
        value={sections.guidance}
        onChange={(v) => setSections({ ...sections, guidance: v })}
        disabled={disabled}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <textarea
        className="w-full border rounded p-3 min-h-[140px]"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function toast(msg: string) {
  // Replace with your toast if you have one
  // eslint-disable-next-line no-alert
  alert(msg);
}
