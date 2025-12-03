// apps/web/app/t/[token]/result/page.tsx
// Legacy compatibility route — redirect to the new /t/[token]/report page.
// This keeps all older “/result?tid=…” links working, while the real logic
// now lives in /t/[token]/report (and that page can then hand off to QSC
// at /qsc/[token]/report when needed).

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyResultRedirect({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const { token } = params;
  const tid = searchParams?.tid || "";

  // If tid is missing, we can't identify the test taker
  if (!tid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
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

  // New unified report route – this page holds the real logic now.
  const target = `/t/${encodeURIComponent(
    token
  )}/report?tid=${encodeURIComponent(tid)}`;

  redirect(target);
}



