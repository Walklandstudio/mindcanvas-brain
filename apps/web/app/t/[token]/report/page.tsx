// apps/web/app/t/[token]/report/page.tsx
import LegacyReportClient from "./LegacyReportClient";

export const dynamic = "force-dynamic";

export default function ReportPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const token = params.token;
  const tid = searchParams?.tid || "";

  return <LegacyReportClient token={token} tid={tid} />;
}





