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
// ⚠️ NOTICE: we no longer import generateReportBuffer here

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

      // Still call assembleNarrative so your HTML / future uses keep working
      const narrative = assembleNarrative({
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
            profileTotals,
            freqTotals,
            narrative,
          },
        },
        { status: 200 }
      );
    }

    // MINI sanity-PDF using @react-pdf/renderer *namespace* (no JSX)
    if (mini) {
      const styles = PDF.StyleSheet.create({
        page: { padding: 24 },
        h1: { fontSize: 18, marginBottom: 12 },
        p: { fontSize: 12, marginBottom: 8 },
      });

      const MiniDoc = React.createElement(
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
              `Taker: ${`${taker.first_name ?? ""} ${
                taker.last_name ?? ""
              }`.trim()}`
            ),
            React.createElement(
              PDF.Text,
              { style: styles.p },
              `Has result: ${latestResult ? "yes" : "no"}`
            )
          )
        )
      );

      const instance: any = PDF.pdf(MiniDoc);
      const bytes: Uint8Array = await instance.toBuffer();
      return new Response(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${params.takerId}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // FULL pipeline: require a result to build a richer PDF
    if (!latestResult) {
      return NextResponse.json(
        { ok: false, error: "no results for taker yet" },
        { status: 404 }
      );
    }

    // We can still use assembleNarrative to get text content,
    // but we render it with safe React-PDF primitives.
    const narrative = assembleNarrative({
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

    const totals: any = latestResult?.totals ?? {};
    const profileTotals: Record<string, number> = totals.profiles ?? {};
    const freqTotals: Record<string, number> = totals.frequencies ?? {};

    const styles = PDF.StyleSheet.create({
      page: { padding: 32 },
      header: {
        fontSize: 20,
        marginBottom: 12,
        color: colors.text,
      },
      subheader: {
        fontSize: 12,
        marginBottom: 8,
      },
      sectionTitle: {
        fontSize: 14,
        marginTop: 16,
        marginBottom: 8,
      },
      p: {
        fontSize: 11,
        marginBottom: 4,
      },
    });

    const FullDoc = React.createElement(
      PDF.Document,
      null,
      React.createElement(
        PDF.Page,
        { size: "A4", style: styles.page },
        React.createElement(
          PDF.View,
          null,
          // Header
          React.createElement(
            PDF.Text,
            { style: styles.header },
            org.name || "MindCanvas Report"
          ),
          React.createElement(
            PDF.Text,
            { style: styles.subheader },
            `Taker: ${`${taker.first_name ?? ""} ${
              taker.last_name ?? ""
            }`.trim()}`
          ),
          taker.email
            ? React.createElement(
                PDF.Text,
                { style: styles.subheader },
                `Email: ${taker.email}`
              )
            : null,
          taker.role_title
            ? React.createElement(
                PDF.Text,
                { style: styles.subheader },
                `Role: ${taker.role_title}`
              )
            : null,
          latestResult?.created_at
            ? React.createElement(
                PDF.Text,
                { style: styles.subheader },
                `Result date: ${new Date(
                  latestResult.created_at
                ).toLocaleString()}`
              )
            : null,

          // Profiles
          React.createElement(
            PDF.Text,
            { style: styles.sectionTitle },
            "Profiles"
          ),
          ...Object.entries(profileTotals).map(([key, value]) =>
            React.createElement(
              PDF.Text,
              { key: `profile-${key}`, style: styles.p },
              `${key}: ${value}`
            )
          ),

          // Frequencies
          React.createElement(
            PDF.Text,
            { style: styles.sectionTitle },
            "Frequencies"
          ),
          ...Object.entries(freqTotals).map(([key, value]) =>
            React.createElement(
              PDF.Text,
              { key: `freq-${key}`, style: styles.p },
              `${key}: ${value}`
            )
          ),

          // Narrative summary (very generic – we can refine later)
          React.createElement(
            PDF.Text,
            { style: styles.sectionTitle },
            "Summary"
          ),
          React.createElement(
            PDF.Text,
            { style: styles.p },
            typeof narrative === "string"
              ? narrative
              : JSON.stringify(narrative ?? {}, null, 2).slice(0, 1500)
          )
        )
      )
    );

    const instance: any = PDF.pdf(FullDoc);
    const bytes: Uint8Array = await instance.toBuffer();

    return new Response(Buffer.from(bytes), {
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
