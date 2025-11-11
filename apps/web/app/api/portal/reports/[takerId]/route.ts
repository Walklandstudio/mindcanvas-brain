export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { assembleNarrative } from "@/lib/report/assembleNarrative";
import { generateReportBuffer } from "@/lib/pdf/generateReport";

type Params = { takerId: string };

export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").trim();

    // 1) taker (authoritative org_id) — use portal schema
    const { data: taker, error: takerErr } = await supabaseAdmin
      .schema("portal")
      .from("test_takers")
      .select("id, org_id, first_name, last_name, email, role")
      .eq("id", params.takerId)
      .single();

    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "taker not found" }, { status: 404 });
    }

    // 2) org by slug (portal), else by taker.org_id
    let { data: org } = await supabaseAdmin
      .schema("portal")
      .from("orgs")
      .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
      .eq("slug", slug)
      .single();

    if (!org) {
      const byId = await supabaseAdmin
        .schema("portal")
        .from("orgs")
        .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
        .eq("id", taker.org_id)
        .single();
      org = byId.data || null;
    }

    if (!org) {
      return NextResponse.json({ ok: false, error: "org not found" }, { status: 404 });
    }

    // 3) latest result (portal)
    const { data: latestResult } = await supabaseAdmin
      .schema("portal")
      .from("test_results")
      .select("totals, created_at")
      .eq("taker_id", params.takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4) assemble + pdf
    const raw = { org, taker, test: null, latestResult: latestResult ?? null };
    const data = assembleNarrative(raw as any);

    const colors = {
      primary: org.brand_primary || "#2d8fc4",
      text: org.brand_text || "#111827",
    };

    const pdfBytes = await generateReportBuffer(data as any, colors);

    // Use a Node Buffer for a clean BodyInit
    const body = Buffer.from(pdfBytes);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${params.takerId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("report error", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
