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
    const rawSlug = url.searchParams.get("slug") ?? "";
    const slug = rawSlug.trim();

    // 1) Load taker (authoritative for org_id)
    const { data: taker, error: takerErr } = await supabaseAdmin
      .from("portal.test_takers")
      .select("id, org_id, first_name, last_name, email, role")
      .eq("id", params.takerId)
      .single();

    if (takerErr || !taker) {
      return NextResponse.json(
        { ok: false, error: "taker not found", debug: { takerErr, params } },
        { status: 404 }
      );
    }

    // 2) Org by slug (case-insensitive), fallback to taker.org_id
    let org: any = null;

    const bySlug = await supabaseAdmin
      .from("portal.orgs")
      .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
      .ilike("slug", slug)
      .maybeSingle();

    if (bySlug.data) {
      org = bySlug.data;
    } else {
      const byId = await supabaseAdmin
        .from("portal.orgs")
        .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
        .eq("id", taker.org_id)
        .maybeSingle();
      org = byId.data ?? null;

      if (!org) {
        return NextResponse.json(
          {
            ok: false,
            error: "org not found",
            debug: {
              supabaseUrl: (process as any).env.NEXT_PUBLIC_SUPABASE_URL,
              projectRef:
                ((process as any).env.NEXT_PUBLIC_SUPABASE_URL || "")
                  .split("https://")[1]
                  ?.split(".supabase.co")[0] || null,
              slug,
              taker: { id: taker.id, org_id: taker.org_id },
              bySlug,
              byId,
            },
          },
          { status: 404 }
        );
      }
    }

    // 3) Latest result for this taker
    const { data: latestResult } = await supabaseAdmin
      .from("portal.test_results")
      .select("totals, created_at")
      .eq("taker_id", params.takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4) Assemble and generate PDF
    const raw = {
      org,
      taker,
      test: null,
      latestResult: latestResult ?? null,
    };

    const data = assembleNarrative(raw as any);
    const colors = {
      primary: org.brand_primary || "#2d8fc4",
      text: org.brand_text || "#111827",
    };

    const pdfBytes = await generateReportBuffer(data as any, colors); // Uint8Array
    const nodeBuf = Buffer.from(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);

    return new Response(nodeBuf as unknown as BodyInit, {
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
