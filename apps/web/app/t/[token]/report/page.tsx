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

  if (!tid) {
    return (
      <div className="min-h-screen bg-[#050914] text-white">
        <main className="mx-auto max-w-3xl px-4 py-10 space-y-3">
          <h1 className="text-2xl font-semibold">Result not available</h1>
          <p className="text-sm text-slate-300">
            This link is missing the required{" "}
            <code className="rounded bg-slate-900 px-1 py-0.5">?tid=</code>{" "}
            parameter, so we can&apos;t load the personalised report.
          </p>
        </main>
      </div>
    );
  }

  return <LegacyReportClient token={token} tid={tid} />;
}





