'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { exportElementToPdf } from '@/lib/exportPdf';

type Props = { id: string; autoDownload?: boolean };

export default function ReportClient({ id, autoDownload = false }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    const node = reportRef.current;
    if (!node) return;
    try {
      setError(null);
      setDownloading(true);
      node.classList.add('pdf-export');
      await exportElementToPdf(node, `MindCanvas-Report-${id}.pdf`, {
        margin: 18,
        scale: 2,
        page: 'a4',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // use the same captured node to satisfy the linter
      node.classList.remove('pdf-export');
      setDownloading(false);
    }
  }, [id]);

  // Auto-download and hide controls using a captured node reference
  useEffect(() => {
    if (!autoDownload) return;
    const node = reportRef.current;
    if (!node) return;

    node.classList.add('pdf-export');
    const t = setTimeout(() => {
      void handleDownload(); // handleDownload will remove the class
    }, 300);

    return () => {
      clearTimeout(t);
      node.classList.remove('pdf-export');
    };
  }, [autoDownload, handleDownload]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header controls (hidden from PDF via CSS .no-pdf + .pdf-export on container) */}
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

      {/* Everything inside reportRef is captured into the PDF */}
      <div ref={reportRef} id="report-root" className="bg-white">
        {/* ⬇️ Your report content goes here (hero, charts, copy, etc.) ⬇️ */}
      </div>
    </div>
  );
}
