export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { assembleNarrative } from "@/lib/report/assembleNarrative";
import { generateReportBuffer } from "@/lib/pdf/generateReport";

type Params = { takerId: string };

export async function GET(req: Request, { params }: { params: Params }) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim();
  const debug = url.searchParams.get("debug") === "1";

  // 🔒 HARD-PIN to portal schema for ALL queries in THIS route
  const db = supabaseAdmin.schema("portal");

  try {
    // 1) Taker (authoritative org_id)
    const takerQ = await db
      .from("test_takers")
      .select("id, org_id, first_name, last_name, email, role")
      .eq("id", params.takerId)
      .maybeSingle();

    const taker = takerQ.data ?? null;
    if (!taker) {
      const payload = { ok: false, error: "taker not found", takerQ };
      return debug ? NextResponse.json(payload, { status: 404 })
                   : NextResponse.json({ ok:false, error:"taker not found" }, { status:404 });
    }

    // 2) Org by slug (case-insensitive) -> fallback by taker.org_id
    let org: any = null;
    let orgBySlugQ: any = null;
    let orgByIdQ: any = null;

    if (slug) {
      orgBySlugQ = await db
        .from("orgs")
        .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
        .ilike("slug", slug)
        .maybeSingle();
      if (orgBySlugQ?.data) org = orgBySlugQ.data;
    }

    if (!org) {
      orgByIdQ = await db
        .from("orgs")
        .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
        .eq("id", taker.org_id)
        .maybeSingle();
      if (orgByIdQ?.data) org = orgByIdQ.data;
    }

    if (!org) {
      const payload = {
        ok: false,
        error: "org not found",
        debug: {
          receivedSlug: slug,
          taker: { id: taker.id, org_id: taker.org_id },
          orgBySlugQ,
          orgByIdQ,
        },
      };
      return NextResponse.json(payload, { status: 404 });
    }

    // 3) Latest result
    const latestResultQ = await db
      .from("test_results")
      .select("totals, created_at")
      .eq("taker_id", params.takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestResult = latestResultQ?.data ?? null;

    if (debug) {
      return NextResponse.json({
        ok: true,
        inputs: { slug, taker: { id: taker.id, org_id: taker.org_id } },
        chosenOrg: org,
        latestResultQ,
      });
    }

    // 4) Assemble & PDF
    const raw = { org, taker, test: null, latestResult };
    const data = assembleNarrative(raw as any);

    const colors = {
      primary: org.brand_primary || "#2d8fc4",
      text:   org.brand_text    || "#111827",
    };

    const pdfBytes = await generateReportBuffer(data as any, colors); // Uint8Array
    const nodeBuf = Buffer.from(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);

    return new Response(nodeBuf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-\${params.takerId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("report error", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
