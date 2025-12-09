// app/api/portal/reports/[takerId]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getServerSupabase } from "@/lib/supabase/server";
import { assembleNarrative } from "@/lib/report/assembleNarrative";

type Params = { takerId: string };

function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";

  const day = d.getDate();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hrs = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");

  return `${day} ${month} ${year}, ${hrs}:${mins}`;
}

export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";
    const wantsJson = url.searchParams.get("json") === "1";
    // We accept ?mini=1 but treat it the same as full PDF for now
    const _mini = url.searchParams.get("mini") === "1";

    const portal = getServerSupabase().schema("portal");

    // 1) Taker
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

    // 2) Org
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

    // 3) Latest result
    const latestResultQ = await portal
      .from("test_results")
      .select("totals, created_at")
      .eq("taker_id", params.takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestResult = latestResultQ.data ?? null;
    const latestLabel = latestResult
      ? formatDateLabel(latestResult.created_at)
      : "N/A";

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

    // --- JSON path (for HTML report / debugging) ---
    if (wantsJson) {
      const totals: any = latestResult?.totals ?? {};
      const profileTotals: Record<string, number> = totals.profiles ?? {};
      const freqTotals: Record<string, number> = totals.frequencies ?? {};

      const topProfileEntry = Object.entries(profileTotals).sort(
        (a, b) => (b[1] as number) - (a[1] as number)
      )[0];
      const top_profile_name = topProfileEntry?.[0] ?? null;

      const narrative =
        latestResult &&
        assembleNarrative({
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
              summary_text: narrative ?? null,
            },
          },
        },
        { status: 200 }
      );
    }

    // --- PDF path (used by portal “Download” + ?mini=1) ---
    const fullName = `${taker.first_name ?? ""} ${
      taker.last_name ?? ""
    }`.trim();

    // Create a simple 1-page PDF using pdf-lib (no React at all)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const titleFontSize = 20;
    const bodyFontSize = 12;

    let y = height - 80;

    page.drawText("MindCanvas Report", {
      x: 60,
      y,
      size: titleFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    page.drawText(`Org: ${org.name ?? ""}`, {
      x: 60,
      y,
      size: bodyFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 20;

    page.drawText(`Taker: ${fullName || "Unknown"}`, {
      x: 60,
      y,
      size: bodyFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 20;

    page.drawText(`Email: ${taker.email ?? "N/A"}`, {
      x: 60,
      y,
      size: bodyFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 20;

    page.drawText(`Has result: ${latestResult ? "yes" : "no"}`, {
      x: 60,
      y,
      size: bodyFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 20;

    page.drawText(`Latest result: ${latestLabel}`, {
      x: 60,
      y,
      size: bodyFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save(); // Uint8Array

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


