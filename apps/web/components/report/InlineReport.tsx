import { fetchReportData } from '@/lib/report/fetchReportData';
import { assembleNarrative } from '@/lib/report/assembleNarrative';
import ReportShell from '@/components/report/ReportShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InlineReport({ orgSlug, takerId }: { orgSlug: string; takerId: string }) {
  const raw = await fetchReportData({ orgSlug, takerId });
  const data = assembleNarrative(raw);
  return <ReportShell data={data as any} />;
}
