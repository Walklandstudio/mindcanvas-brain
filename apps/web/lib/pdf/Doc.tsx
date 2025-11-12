import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ReportData } from '@/lib/report/assembleNarrative';

const styles = StyleSheet.create({
  page:   { padding: 32 },
  h1:     { fontSize: 20, marginBottom: 12 },
  p:      { fontSize: 12, marginBottom: 6 },
  row:    { marginBottom: 8 }
});

/**
 * Minimal, safe PDF doc:
 * - Only strings/numbers inside <Text>
 * - No nested components inside <Text>
 */
export function ReportDoc(data: ReportData, colors: { primary: string; text: string }) {
  const orgName   = String(data?.org?.name ?? '');
  const takerName = String([data?.taker?.first_name, data?.taker?.last_name].filter(Boolean).join(' ') || '');
  const topProf   = String(data?.results?.topProfile?.name ?? '');
  const freqA     = Number(data?.results?.frequencies?.A ?? 0);
  const freqB     = Number(data?.results?.frequencies?.B ?? 0);
  const freqC     = Number(data?.results?.frequencies?.C ?? 0);
  const freqD     = Number(data?.results?.frequencies?.D ?? 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <Text style={styles.h1}>MindCanvas Report</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.p}>Organisation: {orgName}</Text>
          <Text style={styles.p}>Taker: {takerName || '—'}</Text>
          <Text style={styles.p}>Top Profile: {topProf || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.p}>Frequencies (A/B/C/D): {`${freqA} / ${freqB} / ${freqC} / ${freqD}`}</Text>
        </View>
      </Page>
    </Document>
  );
}
