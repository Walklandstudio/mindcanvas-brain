'use client';

import { useEffect, useRef, useState } from 'react';
import { exportElementToPdf } from '@/lib/exportPdf';

type Props = {
  id: string;
  autoDownload?: boolean;
};

export default function ReportClient({ id, autoDownload = false }: Props) {
  // Everything you want in the PDF must be inside this container:
  const reportRef = useRef<HTMLDivElement>(null);

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (!reportRef.current) return;
    try {
      setError(null);
      setDownloading(true);

      // Hide UI controls during export
      reportRef.current.classList.add('pdf-export');

      await exportElementToPdf(
        reportRef.current,
        `MindCanvas-Report-${id}.pdf`,
        { margin: 18, scale: 2, page: 'a4' }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // Always restore UI controls
      reportRef.current?.classList.remove('pdf-export');
      setDownloading(false);
    }
  }

  // 4) Make auto-download also hide controls
  // => Put this effect right here (it's already wired below):
  useEffect(() => {
    if (!autoDownload || !reportRef.current) return;
    // Ensure controls are hidden while auto-export runs
    reportRef.current.classList.add('pdf-export');
    const t = setTimeout(() => {
      // handleDownload() removes the class afterward as well
      void handleDownload();
    }, 300); // small delay to ensure fonts/images are ready

    return () => {
      clearTimeout(t);
      reportRef.current?.classList.remove('pdf-export');
    };
  }, [autoDownload]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header (controls marked .no-pdf so they don't appear in the PDF) */}
      <div className="mb-4 flex items-center justify-between no-pdf">
        <h1 className="text-xl font-semibold">Report</h1>
        <div className="flex gap-2">
          <button
            id="download-report-btn"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* IMPORTANT: Wrap your full report content inside this container */}
      <div ref={reportRef} id="report-root" className="bg-white">
        {/* ⬇️ Your existing report markup goes here ⬇️
            hero, flow pie, profile bars, long-form copy from mc_profiles,
            strengths/watch-outs/tips, actions, etc.
        */}
      </div>
    </div>
  );
}
