/* Render a downloadable PDF using @react-pdf/renderer
   Install once:  npm i @react-pdf/renderer
*/

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as PDF from '@react-pdf/renderer';

/** react-pdf needs Node APIs */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ---------- Types ---------- */
type FlowKey = 'Catalyst' | 'Communications' | 'Rhythmic' | 'Observer';

type ProfileSlice = {
  code: string;
  name: string;
  percent: number;
};

type ReportPayload = {
  id?: string;
  person?: { firstName?: string; lastName?: string; email?: string };
  primaryProfile?: { code: string; name: string };
  flow?: Partial<Record<FlowKey, number>>;
  profiles?: ProfileSlice[];
  welcome?: string;
  outline?: string[];
};

/* ---------- Fonts & Styles ---------- */
PDF.Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvJA.woff2',
    },
  ],
});

const styles = PDF.StyleSheet.create({
  page: { padding: 32, fontFamily: 'Inter', fontSize: 11, color: '#111827' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  h1: { fontSize: 20, fontWeight: 700 },
  h2: { fontSize: 14, marginTop: 16, marginBottom: 8, fontWeight: 600 },
  sub: { fontSize: 11, color: '#6B7280' },
  hr: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  row: { flexDirection: 'row', gap: 16 },
  col: { flexGrow: 1, flexBasis: 0 },
  box: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  pill: {
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  listItem: { marginBottom: 4 },
});

/* ---------- PDF Component ---------- */
function PdfDoc({ data }: { data: ReportPayload }) {
  const name =
    (data.person?.firstName || '') +
    (data.person?.lastName ? ` ${data.person.lastName}` : '');

  const flowEntries: Array<{ key: FlowKey; value: number }> = ([
    'Catalyst',
    'Communications',
    'Rhythmic',
    'Observer',
  ] as const)
    .map((k) => ({ key: k, value: data.flow?.[k] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const primary = data.primaryProfile?.name ?? '—';

  return (
    <PDF.Document title={`MindCanvas Report ${data.id ?? ''}`}>
      <PDF.Page size="A4" style={styles.page}>
        <PDF.View style={styles.headerRow}>
          <PDF.Text style={styles.h1}>Report</PDF.Text>
          <PDF.Text style={styles.sub}>{data.id ?? ''}</PDF.Text>
        </PDF.View>
        <PDF.View style={styles.hr} />

        <PDF.View style={{ marginBottom: 8 }}>
          <PDF.Text style={{ fontSize: 16, marginBottom: 4 }}>
            {name ? `${name}, your Profile is ${primary}` : `Primary Profile: ${primary}`}
          </PDF.Text>
          {data.primaryProfile?.code ? (
            <PDF.Text style={styles.sub}>({data.primaryProfile.code})</PDF.Text>
          ) : null}
        </PDF.View>

        <PDF.View style={[styles.row, { marginTop: 8 }]}>
          <PDF.View style={styles.col}>
            <PDF.Text style={styles.h2}>Your Coaching Flow</PDF.Text>
            <PDF.View style={styles.box}>
              {flowEntries.map((f) => (
                <PDF.View
                  key={f.key}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <PDF.Text>{f.key}</PDF.Text>
                  <PDF.Text>{`${f.value}%`}</PDF.Text>
                </PDF.View>
              ))}
            </PDF.View>
          </PDF.View>

          <PDF.View style={styles.col}>
            <PDF.Text style={styles.h2}>Primary & Auxiliary Profiles</PDF.Text>
            <PDF.View style={styles.box}>
              {(data.profiles ?? []).map((p, i) => (
                <PDF.View
                  key={`${p.code}-${i}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <PDF.Text>
                    {i === 0 ? 'Primary: ' : ''}
                    {p.name}
                    {p.code ? ` (${p.code})` : ''}
                  </PDF.Text>
                  <PDF.Text>{`${p.percent}%`}</PDF.Text>
                </PDF.View>
              ))}
              {(!data.profiles || data.profiles.length === 0) && (
                <PDF.Text style={styles.sub}>
                  No profile breakdown available.
                </PDF.Text>
              )}
            </PDF.View>
          </PDF.View>
        </PDF.View>

        {data.welcome ? (
          <>
            <PDF.Text style={styles.h2}>Welcome</PDF.Text>
            <PDF.View style={styles.box}>
              <PDF.Text>{data.welcome}</PDF.Text>
            </PDF.View>
          </>
        ) : null}

        {data.outline && data.outline.length > 0 ? (
          <>
            <PDF.Text style={styles.h2}>Profile Outline</PDF.Text>
            <PDF.View style={styles.box}>
              {data.outline.map((line, idx) => (
                <PDF.Text key={idx} style={styles.listItem}>
                  • {line}
                </PDF.Text>
              ))}
            </PDF.View>
          </>
        ) : null}

        <PDF.View
          style={{
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <PDF.Text style={styles.pill}>MindCanvas</PDF.Text>
        </PDF.View>
      </PDF.Page>
    </PDF.Document>
  );
}

/* ---------- Handlers ---------- */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let data: ReportPayload = {};
  try {
    data = (await req.json()) as ReportPayload;
  } catch {
    // allow empty body
  }
  data.id = data.id ?? id;

  try {
    const bytes = await PDF.pdf(<PdfDoc data={data} />).toBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MindCanvas_Report_${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: 'PDF render failed', details: msg },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Use POST with JSON payload to generate a PDF.' },
    { status: 405 },
  );
}


export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Use POST with JSON payload to generate a PDF.' },
    { status: 405 },
  );
}
