// apps/web/app/t/[token]/report/page.tsx
import { loadFramework, buildLookups } from "@/lib/frameworks";
import { getBaseUrl } from "@/lib/server-url";

type ReportAPI = {
  ok: boolean;
  data: {
    orgSlug: string;
    taker?: { first_name?: string | null; last_name?: string | null };
    totals: Record<string, number>;
    sections?: Record<string, unknown>;
    top_profile_code?: string | null;
  };
};

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
    { cache: "no-store" },
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
  const fw = await loadFramework(data.orgSlug);
  const { profileByCode, profileNameToCode } = buildLookups(fw);

  // Determine top profile
  let topProfileCode = data.top_profile_code || null;
  if (!topProfileCode) {
    topProfileCode =
      Object.entries(data.totals || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ||
      null;

    if (topProfileCode && !profileByCode.has(topProfileCode)) {
      const maybe = profileNameToCode.get(topProfileCode);
      if (maybe) topProfileCode = maybe;
    }
  }
  const topProfile = topProfileCode ? profileByCode.get(topProfileCode) : undefined;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Your Personalised Report</h1>
        <p className="text-muted-foreground">
          {data.taker?.first_name ?? ""} {data.taker?.last_name ?? ""} — {fw.framework.name}
        </p>
      </header>

      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-medium">Top profile</h2>
        <p className="mt-2 text-2xl font-semibold">{topProfile?.name ?? "—"}</p>
      </section>

      {data.sections ? (
        <pre className="rounded-2xl border p-6 text-sm whitespace-pre-wrap">
          {JSON.stringify(data.sections, null, 2)}
        </pre>
      ) : (
        <section className="rounded-2xl border p-6">
          <p className="text-sm text-muted-foreground">
            Your detailed report content will appear here. (Attach sections in the report API when
            ready.)
          </p>
        </section>
      )}
    </div>
  );
}
