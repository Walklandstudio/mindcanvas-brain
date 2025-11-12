// apps/web/app/api/portal/reports/[takerId]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { assembleNarrative } from "@/lib/report/assembleNarrative";
import { generateReportBuffer } from "@/lib/pdf/generateReport";

type Params = { takerId: string };

export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const url  = new URL(req.url);
    const dbg  = url.searchParams.get("debug") === "1";

    // 1) Load taker (authoritative org_id)
    const takerQ = await supabaseAdmin
      .schema("portal")
      .from("test_takers")
      .select("id, org_id, first_name, last_name, email, role_title")
      .eq("id", params.takerId)
      .single();

    const taker = takerQ.data ?? null;
    if (!taker) {
      return NextResponse.json(
        { ok: false, error: "taker not found", detail: takerQ.error?.message ?? null },
        { status: 404 }
      );
    }

    // 2) Load org strictly by taker.org_id (no slug involved)
    const orgQ = await supabaseAdmin
      .schema("portal")
      .from("orgs")
      .select("id, slug, name, brand_primary, brand_text, logo_url, report_cover_tagline")
      .eq("id", taker.org_id)
      .maybeSingle();

    const org = (orgQ as any).data ?? null;

    if (dbg) {
      return NextResponse.json({
        step: "after-org-by-id",
        schemaClient: "portal",
        taker: { id: taker.id, org_id: taker.org_id },
        org,
        orgErr: (orgQ as any).error ?? null
      }, { status: org ? 200 : 404 });
    }

    if (!org) {
      return NextResponse.json({ ok: false, error: "org not found" }, { status: 404 });
    }

    // 3) Latest result for taker
    const latestResultQ = await supabaseAdmin
      .schema("portal")
      .from("test_results")
      .select("totals, created_at")
      .eq("taker_id", params.takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestResult = (latestResultQ as any).data ?? null;

    // 4) Assemble → PDF
    const raw = {
      org,
      taker: {
        first_name: taker.first_name ?? null,
        last_name:  taker.last_name  ?? null,
        email:      taker.email      ?? null,
        role:       taker.role_title ?? null,
      },
      test: null,
      latestResult
    };

    const data = assembleNarrative(raw as any);
    const colors = {
      primary: org.brand_primary || "#2d8fc4",
      text:    org.brand_text    || "#111827",
    };

    const pdfBytes = await generateReportBuffer(data as any, colors); // Uint8Array
    const body = Buffer.from(pdfBytes); // Valid BodyInit in Node runtime

    return new Response(body, {
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
