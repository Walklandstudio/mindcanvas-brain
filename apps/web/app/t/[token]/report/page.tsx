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
  const token = params.token;
  const tid = searchParams?.tid || "";

  const res = await fetch(
    `/api/public/test/${encodeURIComponent(token)}/report?tid=${encodeURIComponent(tid)}`,
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
        <pre className="rounded-2xl border p-6 text-sm whitespace-pre-wrap">
          {JSON.stringify(sections, null, 2)}
        </pre>
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
