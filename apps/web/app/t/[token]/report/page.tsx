// apps/web/app/t/[token]/report/page.tsx
import ReportRouterClient from "./ReportRouterClient";

export const dynamic = "force-dynamic";

export default function ReportPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  return <ReportRouterClient token={params.token} tid={searchParams?.tid ?? ""} />;
}





