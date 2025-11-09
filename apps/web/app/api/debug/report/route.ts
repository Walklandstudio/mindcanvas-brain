export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchReportData } from "@/lib/report/fetchReportData";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = u.searchParams.get("slug") || "";
  const taker = u.searchParams.get("taker") || "";
  try {
    const raw = await fetchReportData({ orgSlug: slug, takerId: taker });
    return NextResponse.json({
      ok: true,
      org: raw.org ? { id: raw.org.id, slug: raw.org.slug, name: raw.org.name } : null,
      taker: raw.taker ? { id: raw.taker.id, org_id: raw.taker.org_id } : null,
      hasResult: !!raw.latestResult,
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || String(e) }, { status: 500 });
  }
}
