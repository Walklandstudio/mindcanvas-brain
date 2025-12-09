// app/api/portal/reports/[takerId]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import * as React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
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

    // NEW: pure JSON path for HTML reports (no React-PDF)
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

    // MINI sanity-PDF using @react-pdf/renderer with named imports
    if (mini) {
      const styles = StyleSheet.create({
        page: { padding: 24 },
        h1: { fontSize: 18, marginBottom: 12 },
        p: { fontSize: 12, marginBottom: 8 },
      });

      const takerName = `${taker.first_name ?? ""} ${
        taker.last_name ?? ""
      }`.trim();

      const MiniDoc = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4", style: styles.page },
          React.createElement(
            View,
            null,
            React.createElement(
              Text,
              { style: styles.h1 },
              "MindCanvas Report (Mini)"
            ),
            React.createElement(
              Text,
              { style: styles.p },
              `Org: ${org.name ?? ""}`
            ),
            React.createElement(
              Text,
              { style: styles.p },
              `Taker: ${takerName}`
            ),
            React.createElement(
              Text,
              { style: styles.p },
              `Has result: ${latestResult ? "yes" : "no"}`
            )
          )
        )
      );

      const instance = pdf(MiniDoc);
      const bytes: Uint8Array = await instance.toBuffer();

      return new Response(bytes as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${params.takerId}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // FULL pipeline: require a result to build full narrative
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

    // generateReportBuffer may be typed as ReadableStream / unknown.
    // Treat it as an opaque PDF payload and hand it directly to Response.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfPayload: any = await generateReportBuffer(data as any, colors);

    return new Response(pdfPayload as any, {
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

