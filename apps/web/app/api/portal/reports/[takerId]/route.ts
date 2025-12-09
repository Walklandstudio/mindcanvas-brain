// app/api/portal/reports/[takerId]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getServerSupabase } from "@/lib/supabase/server";
import { assembleNarrative } from "@/lib/report/assembleNarrative";
import { generateReportBuffer } from "@/lib/pdf/generateReport";

type Params = { takerId: string };

export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";
    const mini = url.searchParams.get("mini") === "1";
    const wantsJson = url.searchParams.get("json") === "1";

    // Use the existing server Supabase client, scoped to the portal schema
    const portal = getServerSupabase().schema("portal");

    // 1) Taker (authoritative org_id)
    const takerQ = await portal
      .from("test_takers")
      .select("id, org_id, first_name, last_name, email, role_title")
      .eq("id", params.takerId)
      .maybeSingle();

    const taker = takerQ.data ?? null;
    if (!taker) {
      return NextResponse.json(
        {
          ok: false,
          error: "taker not found",
          detail: takerQ.error?.message ?? null,
        },
        { status: 404 }
      );
    }

    // 2) Org by taker.org_id (NO slug involved)
    const orgQ = await portal
      .from("orgs")
      .select("id, slug, name, brand_primary, brand_text, logo_url")
      .eq("id", taker.org_id)
      .maybeSingle();

    const org = orgQ.data ?? null;
    if (!org) {
      return NextResponse.json(
        { ok: false, error: "org not found" },
        { status: 404 }
      );
    }

    // 3) Latest result (optional)
    const latestResultQ = await portal
      .from("test_results")
      .select("totals, created_at")
      .eq("taker_id", params.takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestResult = latestResultQ.data ?? null;

    // Existing debug output: JSON only, no PDF
    if (debug) {
      return NextResponse.json(
        { ok: true, taker, org, latestResult },
        { status: 200 }
      );
    }

    const colors = {
      primary: org.brand_primary || "#2d8fc4",
      text: org.brand_text || "#111827",
    };

    // PURE JSON path for HTML/SPA reports (no PDF generation)
    if (wantsJson) {
      const totals: any = latestResult?.totals ?? {};
      const profileTotals: Record<string, number> = totals.profiles ?? {};
      const freqTotals: Record<string, number> = totals.frequencies ?? {};

      const topProfileEntry = Object.entries(profileTotals).sort(
        (a, b) => (b[1] as number) - (a[1] as number)
      )[0];
      const top_profile_name = topProfileEntry?.[0] ?? null;

      return NextResponse.json(
        {
          ok: true,
          data: {
            title: org.name,
            org,
            taker,
            latestResult,
            colors,
            top_profile_name,
            sections: {
              profiles: profileTotals,
              frequencies: freqTotals,
              summary_text: null,
            },
          },
        },
        { status: 200 }
      );
    }

    // MINI PDF using pdf-lib (no React / no @react-pdf/renderer)
    if (mini) {
      // Basic PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const headingSize = 18;
      const bodySize = 12;

      let cursorY = height - 80;

      const fullName = `${taker.first_name ?? ""} ${
        taker.last_name ?? ""
      }`.trim();

      page.drawText("MindCanvas Report (Mini)", {
        x: 50,
        y: cursorY,
        size: headingSize,
        font,
        color: rgb(0, 0, 0),
      });

      cursorY -= 30;

      page.drawText(`Org: ${org.name ?? ""}`, {
        x: 50,
        y: cursorY,
        size: bodySize,
        font,
        color: rgb(0, 0, 0),
      });

      cursorY -= 20;

      page.drawText(`Taker: ${fullName || taker.email || params.takerId}`, {
        x: 50,
        y: cursorY,
        size: bodySize,
        font,
        color: rgb(0, 0, 0),
      });

      cursorY -= 20;

      page.drawText(
        `Has result: ${latestResult ? "yes" : "no"}`,
        {
          x: 50,
          y: cursorY,
          size: bodySize,
          font,
          color: rgb(0, 0, 0),
        }
      );

      if (latestResult?.created_at) {
        cursorY -= 20;
        page.drawText(
          `Latest result: ${new Date(
            latestResult.created_at
          ).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}`,
          {
            x: 50,
            y: cursorY,
            size: bodySize,
            font,
            color: rgb(0, 0, 0),
          }
        );
      }

      const pdfBytes = await pdfDoc.save();

      return new Response(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${params.takerId}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // FULL pipeline: require a result to build full narrative (still uses generateReportBuffer)
    if (!latestResult) {
      return NextResponse.json(
        { ok: false, error: "no results for taker yet" },
        { status: 404 }
      );
    }

    const data = assembleNarrative({
      org,
      taker: {
        first_name: taker.first_name ?? null,
        last_name: taker.last_name ?? null,
        email: taker.email ?? null,
        role: taker.role_title ?? null,
      },
      test: null,
      latestResult,
    } as any);

    const pdfBytes = await generateReportBuffer(data as any, colors);

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${params.takerId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}


