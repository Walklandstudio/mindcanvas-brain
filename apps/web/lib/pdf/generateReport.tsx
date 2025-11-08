// apps/web/lib/pdf/generateReport.ts
import { renderToBuffer } from '@react-pdf/renderer';
import ReportPDF from './Doc';
import type { ReportData } from '@/components/report/ReportShell';

export async function generateReportBuffer(data: ReportData, brand: { primary: string; text: string }) {
  // pass brand tokens via a tiny global shim the Doc reads
  (global as any).__brand_primary = brand.primary;
  (global as any).__brand_text = brand.text;

  const buffer = await renderToBuffer(<ReportPDF data={data} />);
  delete (global as any).__brand_primary;
  delete (global as any).__brand_text;
  return buffer;
}
