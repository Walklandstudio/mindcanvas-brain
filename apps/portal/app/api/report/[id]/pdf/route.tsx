export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

/* ----------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */
type Flow = { A: number; B: number; C: number; D: number };

type Person = {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type ProfileRow = {
  code: string;
  name: string;
  percent: number;
  pct: number;
  color?: string;
};

type ReportPayload = {
  id: string;
  person?: Person;
  flow: Flow;
  profiles: ProfileRow[];
  profile?: { code?: string; name?: string };
};

/* ----------------------------------------------------------------------------
 * Utils
 * -------------------------------------------------------------------------- */
function colorOfProfile(code?: string): string | undefined {
  switch (code) {
    case 'P1': return '#175f15';
    case 'P2': return '#2ecc2f';
    case 'P3': return '#ea430e';
    case 'P4': return '#f52905';
    case 'P5': return '#f3c90d';
    case 'P6': return '#f8ee18';
    case 'P7': return '#5d5d5d';
    case 'P8': return '#8a8583';
    default:   return undefined;
  }
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 12 },
  h1: { fontSize: 18, marginBottom: 6 },
  sub: { fontSize: 10, color: '#666', marginBottom: 12 },
  hr: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 12 },
  sectionTitle: { fontSize: 14, marginBottom: 6 },
  row: { display: 'flex', flexDirection: 'row', gap: 8 },
  col: { display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1 },
  pill: {
    paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4,
    color: '#fff', fontSize: 10, alignSelf: 'flex-start',
  },
  listItem: { marginBottom: 3 },
});

/* ----------------------------------------------------------------------------
 * PDF
 * -------------------------------------------------------------------------- */
function ReportDoc({ data }: { data: ReportPayload }) {
  const fullName =
    data.person?.name ||
    [data.person?.first_name, data.person?.last_name].filter(Boolean).join(' ');

  const primaryName = data.profile?.name || data.profile?.code || 'Profile';
  const primaryColor = colorOfProfile(data.profile?.code) ?? '#111827';

  const flows = [
    { k: 'A', v: data.flow.A },
    { k: 'B', v: data.flow.B },
    { k: 'C', v: data.flow.C },
    { k: 'D', v: data.flow.D },
  ];

  const profiles = [...data.profiles].sort((a, b) => b.percent - a.percent);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>
          {fullName ? `${fullName}, your Profile is ${primaryName}` : 'Report'}
        </Text>
        <Text style={styles.sub}>Report ID: {data.id}</Text>
        <View style={styles.hr} />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Your Coaching Flow</Text>
            {flows.map((f) => (
              <Text key={f.k} style={styles.listItem}>
                Flow {f.k}: {f.v}%
              </Text>
            ))}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Primary & Auxiliary Profiles</Text>
            <Text style={{ ...styles.pill, backgroundColor: primaryColor }}>
              Primary: {primaryName}
            </Text>
            <View style={{ marginTop: 6 }}>
              {profiles.map((p) => (
                <Text key={p.code} style={styles.listItem}>
                  {p.name} — {p.percent}%
                </Text>
              ))}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* Convert any Uint8Array/Buffer into a *fresh* ArrayBuffer (never SAB) */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

async function renderPDFArrayBuffer(data: ReportPayload): Promise<ArrayBuffer> {
  const instance = pdf(<ReportDoc data={data} />);
  // react-pdf returns a Node Buffer (subclass of Uint8Array). Treat it as Uint8Array.
  const u8 = (await instance.toBuffer()) as unknown as Uint8Array;
  return toArrayBuffer(u8); // guaranteed ArrayBuffer (no SharedArrayBuffer)
}

/* ----------------------------------------------------------------------------
 * Fetch JSON result and ensure id is present
 * -------------------------------------------------------------------------- */
async function fetchReportJSON(id: string): Promise<ReportPayload> {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim();
  const res = await fetch(`${base}/api/submissions/${id}/result`, { cache: 'no-store' });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Failed to fetch report JSON: ${msg || res.status}`);
  }
  const data = (await res.json()) as ReportPayload;
  return { ...data, id: data.id ?? id };
}

/* ----------------------------------------------------------------------------
 * Route
 * -------------------------------------------------------------------------- */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const json = await fetchReportJSON(id);
    const ab = await renderPDFArrayBuffer(json);

    // Send ArrayBuffer directly (valid BodyInit), avoids Blob typing.
    return new Response(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MindCanvas_Report_${json.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: 'PDF render failed', details: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
