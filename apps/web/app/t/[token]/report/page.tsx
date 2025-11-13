// app/t/[token]/report/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReportAPI = { ok: boolean; data: any };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { tid?: string };
}) {
  const tid = searchParams?.tid || "";

  // If we don't have a takerId, tell the user clearly
  if (!tid) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Personalised Report</h1>
        <p className="text-destructive mt-4">
          Missing test taker ID. This page expects a <code>?tid=&lt;takerId&gt;</code> query
          parameter.
        </p>
      </div>
    );
  }

  const res = await fetch(
    `/api/portal/reports/${encodeURIComponent(tid)}?json=1`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Personalised Report</h1>
        <p className="text-destructive mt-4">
          Could not load your report. Please refresh or contact support.
        </p>
      </div>
    );
  }

  const { data } = (await res.json()) as ReportAPI;

  const title =
    data?.title ||
    data?.orgName ||
    (typeof data?.org === "string" ? data.org : data?.org?.name) ||
    "Your Personalised Report";

  const topName: string =
    data?.top_profile_name ||
    data?.taker?.top_profile_name ||
    data?.taker?.top_profile ||
    "—";

  const sections = data?.sections ?? null;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">
          {data?.taker?.first_name ?? ""} {data?.taker?.last_name ?? ""}
        </p>
      </header>

      <div className="no-print">
        <button
          onClick={() => window.print()}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          Download PDF
        </button>
      </div>

      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-medium">Top profile</h2>
        <p className="mt-2 text-2xl font-semibold">{topName}</p>
      </section>

      {sections ? (
        <section className="rounded-2xl border p-6 text-sm space-y-4">
          <div>
            <h3 className="font-semibold mb-1">Frequencies</h3>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(sections.frequencies ?? {}, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Profiles</h3>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(sections.profiles ?? {}, null, 2)}
            </pre>
          </div>
          {sections.summary_text ? (
            <div>
              <h3 className="font-semibold mb-1">Summary</h3>
              <p className="leading-6">{sections.summary_text}</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border p-6">
          <p className="text-sm text-muted-foreground">
            Your detailed report content will appear here once attached by the report API.
          </p>
        </section>
      )}
    </div>
  );
}
