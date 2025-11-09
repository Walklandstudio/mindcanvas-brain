import { pdf } from "@react-pdf/renderer";
import { ReportDoc } from "./Doc";
import type { ReportData } from "@/lib/report/assembleNarrative";

/** Read a WHATWG ReadableStream<Uint8Array> fully into a single Uint8Array */
async function readWebStream(stream: any): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength ?? value.length ?? 0;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength ?? c.length ?? 0; }
  return out;
}

/** Read a Node Readable stream fully into a single Uint8Array */
function readNodeStream(stream: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on?.("data", (c: any) => chunks.push(typeof Buffer !== "undefined" ? Buffer.from(c) : c));
    stream.on?.("end", () => {
      if (typeof Buffer !== "undefined") {
        const b = Buffer.concat(chunks);
        resolve(new Uint8Array(b.buffer, b.byteOffset ?? 0, b.byteLength ?? b.length));
      } else {
        // best effort
        const total = chunks.reduce((n, c) => n + (c?.length ?? c?.byteLength ?? 0), 0);
        const out = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { out.set(c, off); off += c.length ?? c.byteLength ?? 0; }
        resolve(out);
      }
    });
    stream.on?.("error", reject);
  });
}

export async function generateReportBuffer(
  data: ReportData,
  colors: { primary: string; text: string }
): Promise<Uint8Array> {
  const instance: any = pdf(ReportDoc(data, colors));

  // Prefer Buffer; fall back to Blob/Streams if the runtime returns those
  let out: any;
  if (typeof instance.toBuffer === "function") {
    out = await instance.toBuffer(); // Buffer in Node
  } else if (typeof instance.toBlob === "function") {
    out = await instance.toBlob();   // Blob in some runtimes
  } else if (typeof instance.toStream === "function") {
    out = await instance.toStream(); // Node/web streams
  } else {
    throw new Error("Unsupported pdf() output in this runtime");
  }

  // Normalize to Uint8Array
  if (typeof Buffer !== "undefined" && (Buffer as any).isBuffer?.(out)) {
    return new Uint8Array(out.buffer, out.byteOffset ?? 0, out.byteLength ?? out.length);
  }
  if (out && typeof out === "object" && typeof out.arrayBuffer === "function") {
    const ab = await out.arrayBuffer();
    return new Uint8Array(ab);
  }
  if (out && typeof out === "object" && typeof out.getReader === "function") {
    return await readWebStream(out);
  }
  if (out && typeof out === "object" && (out.readable || typeof out.on === "function")) {
    return await readNodeStream(out);
  }
  if (out && (out.buffer && typeof out.byteOffset === "number" && typeof out.byteLength === "number")) {
    return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
  }
  if (out && typeof out.byteLength === "number") {
    return new Uint8Array(out as ArrayBuffer);
  }
  throw new Error("Unknown pdf output type");
}
