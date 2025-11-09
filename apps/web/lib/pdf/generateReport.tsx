import { pdf } from '@react-pdf/renderer';
import { ReportDoc } from '@/lib/pdf/Doc';
import type { ReportData } from '@/lib/report/assembleNarrative';

/**
 * Generate a PDF as Uint8Array for the given report data.
 * Accepts ReportData from assembleNarrative where logo_url can be null.
 */
export async function generateReportBuffer(
  data: ReportData,
  colors: { primary: string; text: string }
): Promise<Uint8Array> {
  // Normalise nullable fields to what the PDF doc expects
  const safe: any = {
    ...data,
    org: {
      ...data.org,
      // coerce null -> undefined to satisfy older prop expectations
      logo_url: (data.org.logo_url ?? null) as string | null,
      tagline: (data.org.tagline ?? null) as string | null,
    },};

  const instance: any = pdf(ReportDoc(safe as any, colors));
  // In Node runtime, toBuffer() returns a Node Buffer (Uint8Array subclass)
  const buf: Uint8Array = await instance.toBuffer();
  // Ensure we always return a plain Uint8Array
  return buf instanceof Uint8Array
    ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    : new Uint8Array(buf as ArrayBuffer);
}
