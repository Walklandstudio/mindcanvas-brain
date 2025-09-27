// lib/exportPdf.ts
// Export a DOM element to a multi-page PDF (A4/Letter), crisp with scaling.
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  opts?: { margin?: number; scale?: number; page?: 'a4' | 'letter' }
): Promise<void> {
  const margin = opts?.margin ?? 16; // pt
  const scale = opts?.scale ?? 2;
  const page = opts?.page ?? 'a4';

  const { default: html2canvas } = (await import('html2canvas')) as typeof import('html2canvas');
  const { jsPDF } = (await import('jspdf')) as typeof import('jspdf');

  // Ensure we're at the top before capture
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

  const canvas = await html2canvas(element, {
    scale,               // higher = sharper (and bigger RAM)
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');

  // PDF page in points
  const pdf = new jsPDF('p', 'pt', page);
  const fullW = pdf.internal.pageSize.getWidth();
  const fullH = pdf.internal.pageSize.getHeight();
  const usableW = fullW - margin * 2;
  const usableH = fullH - margin * 2;

  // Scale image to fit the width of the page
  const imgW = usableW;
  const imgH = (canvas.height * imgW) / canvas.width;

  // First page
  pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH, undefined, 'FAST');

  // Add extra pages as needed (crop by shifting Y negatively)
  let heightLeft = imgH - usableH;
  while (heightLeft > 0) {
    pdf.addPage();
    const position = margin - (imgH - heightLeft);
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH, undefined, 'FAST');
    heightLeft -= usableH;
  }

  pdf.save(filename);
}
