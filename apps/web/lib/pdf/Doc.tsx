import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ReportData } from '@/lib/report/assembleNarrative';

const styles = StyleSheet.create({
  page: { padding: 32 },
  h1: { fontSize: 20, marginBottom: 12 },
  p: { fontSize: 12, marginBottom: 6 },
  row: { marginBottom: 8 },
});

/**
 * Minimal, safe PDF doc that:
 * - Uses taker.fullName (assembleNarrative output) instead of first_name/last_name
 * - Only renders strings/numbers inside <Text>
 */
export function ReportDoc(data: ReportData, colors: { primary: string; text: string }) {
  const orgName   = String((data as any)?.org?.name ?? '');
  const takerName = String((data as any)?.taker?.fullName ?? '');
  const topProf   = String((data as any)?.results?.topProfile?.name ?? '');
  const freqA     = Number((data as any)?.results?.frequencies?.A ?? 0);
  const freqB     = Number((data as any)?.results?.frequencies?.B ?? 0);
  const freqC     = Number((data as any)?.results?.frequencies?.C ?? 0);
  const freqD     = Number((data as any)?.results?.frequencies?.D ?? 0);

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
          <Text style={styles.p}>
            Frequencies (A/B/C/D): {`${freqA} / ${freqB} / ${freqC} / ${freqD}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
