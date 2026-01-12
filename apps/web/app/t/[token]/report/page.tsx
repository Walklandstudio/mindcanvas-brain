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
  const tid = typeof searchParams?.tid === "string" ? searchParams.tid : "";
  return <ReportRouterClient token={params.token} tid={tid} />;
}





