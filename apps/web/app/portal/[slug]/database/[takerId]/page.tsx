// server component - taker detail
import { notFound } from "next/navigation";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function TakerDetail({
  params,
}: {
  params: { slug: string; takerId: string };
}) {
  const { slug, takerId } = params;
  const sb = createClient().schema("portal");

  // taker + org check
  const { data: taker, error: takerErr } = await sb
    .from("test_takers")
    .select("id, org_id, first_name, last_name, email, company, team")
    .eq("id", takerId)
    .maybeSingle();

  if (takerErr || !taker) return notFound();

  const { data: org } = await sb
    .from("orgs")
    .select("id, slug, name")
    .eq("id", taker.org_id)
    .maybeSingle();

  if (!org || org.slug !== slug) return notFound();

  // latest completed submission
  const { data: latest } = await sb
    .from("v_latest_completed_submission")
    .select("submission_id, test_id, completed_at")
    .eq("taker_id", taker.id)
    .maybeSingle();

  // test meta
  const { data: test } = latest
    ? await sb.from("tests")
        .select("id, name, test_type")
        .eq("id", latest.test_id)
        .maybeSingle()
    : { data: null };

  // results (all rows for that submission)
  const { data: results } = latest
    ? await sb
        .from("test_results")
        .select("kind, code, name, percent, raw")
        .eq("submission_id", latest.submission_id)
        .order("kind", { ascending: true })
    : { data: [] as any[] };

  const fullName =
    [taker.first_name, taker.last_name].filter(Boolean).join(" ").trim() || "—";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{fullName}</h1>
          <p className="text-sm text-gray-500">{org.name}</p>
        </div>
        <div className="flex gap-2">
          {latest && (
            <a
              className="rounded-md border px-3 py-2 text-sm"
              href={`/api/portal/report/${latest.submission_id}.pdf`}
            >
              Generate PDF
            </a>
          )}
          <a
            className="rounded-md border px-3 py-2 text-sm"
            href={`/portal/${slug}/database`}
          >
            Back
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h2 className="font-medium mb-2">Identity</h2>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-gray-500">Email</dt>
            <dd className="col-span-2">{taker.email || "—"}</dd>
            <dt className="text-gray-500">Company</dt>
            <dd className="col-span-2">{taker.company || "—"}</dd>
            <dt className="text-gray-500">Team</dt>
            <dd className="col-span-2">{taker.team || "—"}</dd>
          </dl>
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="font-medium mb-2">Latest Submission</h2>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-gray-500">Test</dt>
            <dd className="col-span-2">{test?.name || "—"}</dd>
            <dt className="text-gray-500">Type</dt>
            <dd className="col-span-2">{test?.test_type || "—"}</dd>
            <dt className="text-gray-500">Completed</dt>
            <dd className="col-span-2">
              {latest?.completed_at
                ? new Date(latest.completed_at).toLocaleString()
                : "—"}
            </dd>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium mb-3">Frequency / Profile Mix</h2>
        <pre className="text-xs overflow-auto rounded bg-gray-50 p-3">
{JSON.stringify(results ?? [], null, 2)}
        </pre>
      </section>
    </div>
  );
}
