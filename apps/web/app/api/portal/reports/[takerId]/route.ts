// apps/web/app/api/portal/reports/[takerId]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { assembleNarrative } from "@/lib/report/assembleNarrative";
import { generateReportBuffer } from "@/lib/pdf/generateReport";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

type Params = { takerId: string };

export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const portal = supabaseAdmin.schema("portal");
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";
    const mini  = url.searchParams.get("mini") === "1";

    // 1) Taker (authoritative org_id)
    const takerQ = await portal
      .from("test_takers")
      .select("id, org_id, first_name, last_name, email, role_title")
      .eq("id", params.takerId)
      .maybeSingle();

    const taker = takerQ.data ?? null;
    if (!taker) {
      return NextResponse.json(
        { ok: false, error: "taker not found", detail: takerQ.error?.message ?? null },
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
      return NextResponse.json({ ok: false, error: "org not found" }, { status: 404 });
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

    if (debug) {
      return NextResponse.json(
        { ok: true, taker, org, latestResult },
        { status: 200 }
      );
    }

    const colors = {
      primary: org.brand_primary || "#2d8fc4",
      text:    org.brand_text    || "#111827",
    };

    // MINI: guaranteed-safe PDF (no custom components)
    if (mini) {
      const styles = StyleSheet.create({
        page: { padding: 24 },
        h1: { fontSize: 18, marginBottom: 12 },
        p: { fontSize: 12, marginBottom: 8 },
      });

      const MiniDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <View>
              <Text style={styles.h1}>MindCanvas Report (Mini)</Text>
              <Text style={styles.p}>Org: {(org.name ?? "").toString()}</Text>
              <Text style={styles.p}>
                Taker: {`${taker.first_name ?? ""} ${taker.last_name ?? ""}`.trim()}
              </Text>
              <Text style={styles.p}>Has result: {latestResult ? "yes" : "no"}</Text>
            </View>
          </Page>
        </Document>
      );

      const { pdf } = await import("@react-pdf/renderer");
      const instance: any = pdf(MiniDoc);
      const bytes: Uint8Array = await instance.toBuffer();
      return new Response(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${params.takerId}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // FULL pipeline (guard if no results yet)
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
        last_name:  taker.last_name  ?? null,
        email:      taker.email      ?? null,
        role:       taker.role_title ?? null,
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
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
