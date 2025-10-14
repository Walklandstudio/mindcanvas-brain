"use client";

import React from "react";

type Props = {
  /** The report (submission) id used by the API route */
  id: string;
  /** Optional: file name (without .pdf) */
  filename?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function PdfButton({
  id,
  filename = "report",
  className,
  children,
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setErr(null);
    try {
      // Fetch server-rendered PDF (generated with @react-pdf/renderer)
      const res = await fetch(`/api/report/${id}/pdf`, {
        method: "GET",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `PDF request failed: ${res.status}`);
      }

      // Turn into a Blob and download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
      >
        {busy ? "Generating…" : children ?? "Download PDF"}
      </button>
      {err && (
        <p className="mt-2 text-xs text-red-400">
          Failed to generate PDF: {err}
        </p>
      )}
    </div>
  );
}
