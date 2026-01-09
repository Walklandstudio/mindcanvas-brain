// apps/web/app/t/[token]/report/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import LegacyReportClient from "./LegacyReportClient";

export const dynamic = "force-dynamic";

export default function ReportPageWrapper({ params }: { params: { token: string } }) {
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";
  return <LegacyReportClient token={params.token} tid={tid} />;
}





