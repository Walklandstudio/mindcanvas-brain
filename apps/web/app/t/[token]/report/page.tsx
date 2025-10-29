// Minimal, API-only report page. No filesystem reads.

import { getBaseUrl } from "@/lib/server-url";

type ReportAPI = { ok: boolean; data: any };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const token = params.token;
  const tid = searchParams?.tid || "";
  const base = await getBaseUrl();

  const res = await fetch(
    `${base}/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(tid)}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Personalised Report</h1>
        <p className="text-destructive mt-4">Could not load your report. Please refresh.</p>
      </div>
    );
  }

  const { data } = (await res.json()) as ReportAPI;

  const title =
    data?.title ||
    data?.orgName ||
    "Your Personalised Report";

  const topName =
    data?.top_profile_name ||
    data?.taker?.top_profile_name ||
    "—";

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">
          {data?.taker?.first_name ?? ""} {data?.taker?.last_name ?? ""}
        </p>
      </header>

      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-medium">Top profile</h2>
        <p className="mt-2 text-2xl font-semibold">{topName}</p>
      </section>

      {data?.sections ? (
        <pre className="rounded-2xl border p-6 text-sm whitespace-pre-wrap">
          {JSON.stringify(data.sections, null, 2)}
        </pre>
      ) : (
        <section className="rounded-2xl border p-6">
          <p className="text-sm text-muted-foreground">
            Your detailed report content will appear here when attached by the report service.
          </p>
        </section>
      )}
    </div>
  );
}
