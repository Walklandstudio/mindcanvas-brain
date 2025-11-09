import { type NextRequest } from "next/server";
import { fetchReportData } from "@/lib/report/fetchReportData";
import { assembleNarrative } from "@/lib/report/assembleNarrative";
import { generateReportBuffer } from "@/lib/pdf/generateReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest, ctx: { params: { takerId: string } }) {
  return handle(req, ctx);
}
export async function GET(req: NextRequest, ctx: { params: { takerId: string } }) {
  return handle(req, ctx);
}

async function handle(req: NextRequest, { params }: { params: { takerId: string } }) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  if (!slug) {
    return new Response(JSON.stringify({ ok: false, error: "missing org slug (?slug=...)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await fetchReportData({ orgSlug: slug, takerId: params.takerId });
    if (!raw?.org) {
      return new Response(JSON.stringify({ ok: false, error: "org not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!raw?.taker) {
      return new Response(JSON.stringify({ ok: false, error: "taker not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = assembleNarrative(raw);
    const pdf = await generateReportBuffer(data, {
      primary: raw.org.brand_primary ?? "#2d8fc4",
      text: raw.org.brand_text ?? "#111827",
    });

    // Normalize to Blob (works for Buffer | Uint8Array | ArrayBuffer)
    let bytes: Uint8Array;
    const anyPdf: any = pdf;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(anyPdf)) {
      bytes = new Uint8Array(anyPdf.buffer, anyPdf.byteOffset, anyPdf.byteLength);
    } else if (anyPdf && anyPdf.buffer && typeof anyPdf.byteOffset === "number") {
      bytes = new Uint8Array(anyPdf.buffer, anyPdf.byteOffset, anyPdf.byteLength);
    } else if (anyPdf && typeof anyPdf.byteLength === "number" && typeof anyPdf.slice === "function") {
      bytes = new Uint8Array(anyPdf as ArrayBuffer);
    } else {
      bytes = anyPdf as Uint8Array;
    }
    const blob = new Blob([bytes], { type: "application/pdf" });

    return new Response(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${params.takerId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("report-pdf-error:", err);
    return new Response(JSON.stringify({ ok: false, error: "failed to generate pdf" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
