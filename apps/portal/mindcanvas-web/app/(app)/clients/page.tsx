// app/(app)/clients/[id]/page.tsx
import Link from "next/link";

/** Next 15: params is a Promise */
type PageProps = { params: Promise<{ id: string }> };

type Answer = {
  question_id: string;
  question?: string | null;
  option_id?: string | null;
  option_label?: string | null;
  points?: number | null;
};

type ClientResult = {
  id: string;
  created_at?: string | null;
  report_id?: string | null;
  person?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  result?: {
    profile_code?: string | null;
    flow_a?: number | null;
    flow_b?: number | null;
    flow_c?: number | null;
    flow_d?: number | null;
  } | null;
  answers: Answer[];
};

export const dynamic = "force-dynamic";

export default async function ClientPage(props: PageProps) {
  const { id } = await props.params;

  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/admin/clients/${id}`, {
    cache: "no-store",
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    return (
      <div className="p-6">
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load client: {text || r.statusText}
        </div>
        <Link href="/clients" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
          ← Back
        </Link>
      </div>
    );
  }

  const data: ClientResult | { error: string } = await r.json();

  if ("error" in data) {
    return (
      <div className="p-6">
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {data.error}
        </div>
        <Link href="/clients" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
          ← Back
        </Link>
      </div>
    );
  }

  const person = data.person ?? {};
  const res = data.result ?? {};

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/clients" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
          ← Back
        </Link>
        {data.report_id ? (
          <a
            className="rounded bg-black px-4 py-2 text-sm text-white"
            href={`/report/${data.report_id}`}
          >
            View report
          </a>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Client</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Name</div>
            <div className="text-sm">
              {(person.first_name ?? "—") + " " + (person.last_name ?? "")}
            </div>
            <div className="mt-3 text-xs text-gray-500">Email</div>
            <div className="text-sm">{person.email ?? "—"}</div>
            <div className="mt-3 text-xs text-gray-500">Phone</div>
            <div className="text-sm">{person.phone ?? "—"}</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Profile</div>
            <div className="text-sm">{res.profile_code ?? "—"}</div>

            <div className="mt-3 text-xs text-gray-500">Flow (A/B/C/D)</div>
            <div className="text-sm">
              {(res.flow_a ?? 0)}/{(res.flow_b ?? 0)}/{(res.flow_c ?? 0)}/{(res.flow_d ?? 0)}
            </div>
          </div>
        </div>

        <details className="mt-6 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Answers</summary>
          {data.answers?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {data.answers.map((a) => (
                <li key={a.question_id} className="rounded border p-2">
                  <div className="text-gray-700">{a.question ?? a.question_id}</div>
                  <div className="text-gray-500">
                    {a.option_label ?? a.option_id} {typeof a.points === "number" ? `• ${a.points} pts` : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No answers captured.</p>
          )}
        </details>
      </div>
    </div>
  );
}
