// app/api/portal/reports/[takerId]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import * as React from "react";
import * as PDF from "@react-pdf/renderer";
import { getServerSupabase } from "@/lib/supabase/server";
import { assembleNarrative } from "@/lib/report/assembleNarrative";

type Params = { takerId: string };

// Very simple styles – this is the version that we *know* works
const styles = PDF.StyleSheet.create({
  page: { padding: 24 },
  h1: { fontSize: 18, marginBottom: 12 },
  p: { fontSize: 12, marginBottom: 8 },
});

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
    // ?mini=1 is accepted but uses the same PDF for now
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

    // --- JSON path for HTML reports / debugging ---
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

    // This is the same shape that already worked in your earlier mini PDF
    const Doc = React.createElement(
      PDF.Document,
      null,
      React.createElement(
        PDF.Page,
        { size: "A4", style: styles.page },
        React.createElement(
          PDF.View,
          null,
          React.createElement(
            PDF.Text,
            { style: styles.h1 },
            "MindCanvas Report (Mini)"
          ),
          React.createElement(
            PDF.Text,
            { style: styles.p },
            `Org: ${org.name ?? ""}`
          ),
          React.createElement(
            PDF.Text,
            { style: styles.p },
            `Taker: ${fullName || "Unknown"}`
          ),
          React.createElement(
            PDF.Text,
            { style: styles.p },
            `Has result: ${latestResult ? "yes" : "no"}`
          ),
          React.createElement(
            PDF.Text,
            { style: styles.p },
            `Latest result: ${latestLabel}`
          )
        )
      )
    );

    const instance: any = PDF.pdf(Doc);
    const pdfBytes: Uint8Array = await instance.toBuffer();

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


