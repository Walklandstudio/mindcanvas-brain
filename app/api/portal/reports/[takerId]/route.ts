export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { fetchReportData } from "@/lib/report/fetchReportData";
import { generateReportBuffer } from "@/lib/pdf/generateReport"; // you already have this

export async function GET(req: Request, ctx: { params: { takerId: string } }) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "";
    const takerId = ctx.params.takerId;

    const raw = await fetchReportData({ orgSlug: slug, takerId });
    if (!raw.org) return NextResponse.json({ ok: false, error: "org not found" }, { status: 404 });
    if (!raw.taker || !raw.latestResult) {
      return NextResponse.json({ ok: false, error: "missing taker or result" }, { status: 404 });
    }

    const bytes = await generateReportBuffer(raw); // Uint8Array
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${takerId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
