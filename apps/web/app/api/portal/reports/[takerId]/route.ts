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

    // ✅ Convert to a web-compatible Uint8Array (fixes all Buffer/ArrayBuffer type errors)
    const body =
      pdf instanceof Uint8Array
        ? pdf
        : pdf instanceof ArrayBuffer
        ? new Uint8Array(pdf)
        : new Uint8Array(
            (pdf as Buffer).buffer,
            (pdf as Buffer).byteOffset,
            (pdf as Buffer).byteLength
          );

    return new Response(body, {
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
