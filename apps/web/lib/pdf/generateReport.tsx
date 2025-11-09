import { pdf } from "@react-pdf/renderer";
import { ReportDoc } from "./Doc";
import type { ReportData } from "@/lib/report/assembleNarrative";

export async function generateReportBuffer(
  data: ReportData,
  colors: { primary: string; text: string }
): Promise<Uint8Array> {
  const instance = pdf(ReportDoc(data, colors));
  const buf = await instance.toBuffer(); // Node Buffer (Uint8Array subclass)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
