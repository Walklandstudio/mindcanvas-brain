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
  const slugRaw = url.searchParams.get("slug") || "";
  const slug = slugRaw.trim().toLowerCase();
  const wantDebug = url.searchParams.get("debug") === "1";

  try {
    // 1) Taker (authoritative org_id)
    const { data: taker, error: takerErr } = await supabaseAdmin
      .from("portal.test_takers")
      .select("id, org_id, first_name, last_name, email, role")
      .eq("id", params.takerId)
      .single();

    if (takerErr || !taker) {
      const payload = { ok: false, error: "taker not found", details: { takerErr } };
      return wantDebug ? NextResponse.json(payload, { status: 404 }) : NextResponse.json({ ok: false, error: "taker not found" }, { status: 404 });
    }

    // 2) Org: prefer by ID (authoritative); fallback by slug if needed.
    let orgQuery = "byId";
    let { data: org, error: orgByIdErr } = await supabaseAdmin
      .from("portal.orgs")
      .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
      .eq("id", taker.org_id)
      .maybeSingle();

    if (!org) {
      orgQuery = "bySlug";
      const { data: bySlug, error: orgBySlugErr } = await supabaseAdmin
        .from("portal.orgs")
        .select("id, slug, name, brand_primary, brand_text, report_cover_tagline, logo_url")
        // use ilike to dodge case sensitivity & stray caps
        .ilike("slug", slug || "")
        .maybeSingle();
      org = bySlug ?? null;

      if (!org) {
        const payload = {
          ok: false,
          error: "org not found",
          details: {
            tried: { byId: taker.org_id, bySlug: slug || "(empty)" },
            errors: { orgByIdErr, orgBySlugErr },
            note: "Checking portal.orgs with service-role; if this fails, env vars likely point at a DB without this org row.",
          },
        };
        return wantDebug ? NextResponse.json(payload, { status: 404 }) : NextResponse.json({ ok: false, error: "org not found" }, { status: 404 });
      }
    }

    // 3) Latest result for this taker
    const { data: latestResult, error: latestErr } = await supabaseAdmin
      .from("portal.test_results")
      .select("totals, created_at")
      .eq("taker_id", params.takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wantDebug) {
      return NextResponse.json({
        ok: true,
        debug: true,
        orgQueryPath: orgQuery,
        slugGiven: slugRaw,
        taker: { id: taker.id, org_id: taker.org_id },
        org: { id: org.id, slug: org.slug, name: org.name },
        hasResult: !!latestResult,
        errors: { takerErr, orgByIdErr, latestErr },
      });
    }

    // 4) Assemble and render PDF
    const raw = { org, taker, test: null, latestResult: latestResult ?? null };
    const data = assembleNarrative(raw as any);
    const colors = {
      primary: org.brand_primary || "#2d8fc4",
      text: org.brand_text || "#111827",
    };

    const pdfBytes = await generateReportBuffer(data as any, colors);

    return new Response(pdfBytes as unknown as BodyInit, {
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
