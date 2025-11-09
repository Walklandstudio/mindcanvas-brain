// app/api/portal/reports/[takerId]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin as sb } from "@/lib/server/supabaseAdmin";
import { pdf, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// --- tiny helpers ---
type Json = any;
function parseTotals(t: Json): Record<string, number> {
  try {
    if (!t) return {};
    if (typeof t === "string") {
      const once = JSON.parse(t);
      return typeof once === "string" ? JSON.parse(once) : once;
    }
    return t as Record<string, number>;
  } catch {
    return {};
  }
}

export async function GET(req: Request, ctx: { params: { takerId: string } }) {
  try {
    const { takerId } = ctx.params;
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing slug" }, { status: 400 });
    }

    const p = sb.schema("portal");

    // Org
    const { data: org, error: orgErr } = await p
      .from("orgs")
      .select("id,slug,name,brand_primary,brand_text,logo_url,report_cover_tagline,report_disclaimer")
      .eq("slug", slug)
      .maybeSingle();

    if (orgErr || !org) {
      return NextResponse.json({ ok: false, error: "org not found" }, { status: 404 });
    }

    // Taker
    const { data: taker } = await p
      .from("test_takers")
      .select("id,org_id,first_name,last_name,email,role_title")
      .eq("id", takerId)
      .maybeSingle();

    if (!taker || taker.org_id !== org.id) {
      return NextResponse.json({ ok: false, error: "taker not found" }, { status: 404 });
    }

    // Latest result
    const { data: results } = await p
      .from("test_results")
      .select("id,created_at,totals")
      .eq("taker_id", taker.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const latest = results?.[0] || null;
    const totals = parseTotals(latest?.totals);
    const freq = Object.fromEntries(
      ["A", "B", "C", "D"].map((f) => [f, Number(totals?.[f] ?? totals?.[f.toLowerCase()] ?? 0)])
    );

    // --- simple PDF (brand-aware) ---
    const colors = {
      primary: org.brand_primary || "#000000",
      text: org.brand_text || "#111827",
    };

    const styles = StyleSheet.create({
      page: { padding: 32, fontSize: 12, color: "#000" },
      header: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 8 },
      orgRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
      orgName: { fontSize: 16, fontWeight: 700 },
      logo: { width: 72, height: 24, objectFit: "contain" },
      h1: { fontSize: 18, fontWeight: 700, marginTop: 16, marginBottom: 8 },
      h2: { fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 6 },
      p: { marginBottom: 6, lineHeight: 1.4 },
      row: { flexDirection: "row", alignItems: "center", gap: 8 },
      barWrap: { height: 6, flex: 1, backgroundColor: "#e5e7eb" },
      footer: { position: "absolute", left: 32, right: 32, bottom: 24, fontSize: 9, color: "#6b7280" },
    });

    const fullName = [taker.first_name, taker.last_name].filter(Boolean).join(" ").trim() || "—";
    const today = new Date().toLocaleDateString();

    const Report = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.orgRow}>
              <Text style={{ ...styles.orgName, color: colors.primary }}>{org.name}</Text>
              {org.logo_url ? <Image src={org.logo_url} style={styles.logo} /> : null}
            </View>
          </View>

          <Text style={styles.h1}>Personalised Report</Text>
          {org.report_cover_tagline ? <Text style={styles.p}>{org.report_cover_tagline}</Text> : null}

          <Text style={styles.h2}>Participant</Text>
          <Text style={styles.p}>Name: {fullName}</Text>
          <Text style={styles.p}>Email: {taker.email || "—"}</Text>
          <Text style={styles.p}>Role: {taker.role_title || "—"}</Text>
          <Text style={styles.p}>Date: {today}</Text>

          <Text style={styles.h2}>Frequency Mix</Text>
          {(["A", "B", "C", "D"] as const).map((code) => {
            const val = Number(freq[code] || 0);
            const pct = Math.max(0, Math.min(100, val));
            return (
              <View key={code} style={{ ...styles.row, marginBottom: 6 }}>
                <Text>{code}</Text>
                <View style={styles.barWrap}>
                  <View style={{ height: 6, width: `${pct}%`, backgroundColor: colors.primary }} />
                </View>
                <Text>{pct}%</Text>
              </View>
            );
          })}

          {org.report_disclaimer ? (
            <>
              <Text style={styles.h2}>Disclaimer</Text>
              <Text style={{ ...styles.p, color: "#6b7280" }}>{org.report_disclaimer}</Text>
            </>
          ) : null}

          <Text style={styles.footer}>
            © {new Date().getFullYear()} {org.name}. Generated by MindCanvas.
          </Text>
        </Page>
      </Document>
    );

    const instance: any = pdf(Report);
    const buf: any = await instance.toBuffer(); // Node Buffer (Uint8Array subclass)

    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${takerId}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
