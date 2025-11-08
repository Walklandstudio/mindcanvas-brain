// apps/web/lib/pdf/Doc.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { ReportData } from '@/components/report/ReportShell';

export function buildStyles(colors:{primary:string;text:string}, fontSize=12) {
  return StyleSheet.create({
    page: { padding: 28, fontSize, color: colors.text },
    h1: { fontSize: fontSize+6, marginBottom: 8, color: colors.primary },
    h2: { fontSize: fontSize+2, marginTop: 12, marginBottom: 6 },
    box: { border: 1, borderColor: '#e5e7eb', padding: 8, borderRadius: 6, marginBottom: 6 },
    logo: { height: 24, marginBottom: 8 }
  });
}

export default function ReportPDF({ data }: { data: ReportData }) {
  const colors = {
    primary: (global as any).__brand_primary ?? '#2d8fc4',
    text: (global as any).__brand_text ?? '#111827',
  };
  const styles = buildStyles(colors, 12);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {data.org.logo_url ? <Image src={data.org.logo_url} style={styles.logo} /> : null}
        <Text style={styles.h1}>{(data.org.brand_name ?? data.org.name) + ' — Signature Profiling Report'}</Text>
        {data.org.report_cover_tagline ? <Text>{data.org.report_cover_tagline}</Text> : null}

        <View style={{ marginTop: 10 }}>
          <Text>Participant: {data.taker.first_name} {data.taker.last_name}</Text>
          <Text>Date: {(new Date()).toLocaleDateString()}</Text>
        </View>

        <Text style={styles.h2}>Frequency Summary</Text>
        <View style={styles.box}>
          <Text>A: {Math.round(data.results.frequencies.A)}%</Text>
          <Text>B: {Math.round(data.results.frequencies.B)}%</Text>
          <Text>C: {Math.round(data.results.frequencies.C)}%</Text>
          <Text>D: {Math.round(data.results.frequencies.D)}%</Text>
        </View>

        <Text style={styles.h2}>Top Profile</Text>
        <View style={styles.box}>
          <Text>{data.results.topProfile.name}</Text>
          {data.results.topProfile.desc ? <Text>{data.results.topProfile.desc}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
