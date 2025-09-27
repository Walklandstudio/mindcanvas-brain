// app/report/[id]/page.tsx
import ReportClient from './ReportClient';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ download?: string }>;
}) {
  const { id } = await params;
  const { download } = await searchParams;
  const autoDownload = download === '1';

  return <ReportClient id={id} autoDownload={autoDownload} />;
}
