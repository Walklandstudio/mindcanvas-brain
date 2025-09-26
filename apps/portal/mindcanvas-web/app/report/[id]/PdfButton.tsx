'use client';

import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Props = {
  targetId?: string; // defaults to 'report-root'
};

export default function PdfButton({ targetId = 'report-root' }: Props) {
  const onClick = useCallback(async () => {
    const node = document.getElementById(targetId);
    if (!node) return;

    // Make sure charts are fully painted
    await new Promise(r => setTimeout(r, 150));

    const canvas = await html2canvas(node, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageW - w) / 2;
    const y = 24;

    pdf.addImage(imgData, 'PNG', x, y, w, h);
    pdf.save('Competency-Coach-Report.pdf');
  }, [targetId]);

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium"
    >
      Download PDF
    </button>
  );
}
