// app/report/[id]/PdfButton.tsx
'use client';

import { useCallback, useState } from 'react';

type Props = { targetId?: string };

export default function PdfButton({ targetId = 'report-root' }: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    const node = document.getElementById(targetId);
    if (!node || busy) return;
    setBusy(true);
    try {
      // Lazy-load on demand to keep initial bundle small
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // give charts a tick to finish rendering
      await new Promise((r) => setTimeout(r, 120));

      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const img = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(pw / canvas.width, ph / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pw - w) / 2;
      const y = 24;

      pdf.addImage(img, 'PNG', x, y, w, h);
      pdf.save('Competency-Coach-Report.pdf');
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('Sorry, PDF export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [targetId, busy]);

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium disabled:opacity-60"
      title="Download this report as PDF"
    >
      {busy ? 'Preparing…' : 'Download PDF'}
    </button>
  );
}
