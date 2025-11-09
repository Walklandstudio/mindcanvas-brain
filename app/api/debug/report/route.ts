// SENTINEL 2025-11-09T15:50:20Z
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { fetchReportData } from "@/lib/report/fetchReportData";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const taker = url.searchParams.get("taker") || "";

  try {
    const raw = await fetchReportData({ orgSlug: slug, takerId: taker });
    return NextResponse.json({
      ok: true,
      org: raw.org ? { id: raw.org.id, slug: raw.org.slug, schema: raw.org.__schema ?? "portal" } : null,
      taker: raw.taker ? { id: raw.taker.id, org_id: raw.taker.org_id } : null,
      hasResult: !!raw.latestResult,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
