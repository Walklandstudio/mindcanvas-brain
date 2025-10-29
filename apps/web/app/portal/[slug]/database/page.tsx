import Link from "next/link";
import { createClient } from "@/lib/supabaseAdmin";
export const dynamic = "force-dynamic";

export default async function DatabasePage({ params }: any) {
  const { slug } = params;
  const sb = createClient().schema("portal");

  const { data: rows, error } = await sb
    .from("v_test_takers")
    .select("*")
    .eq("org_slug", slug)
    .order("taken_at", { ascending: false });

  if (error) return <div className="p-6 text-red-600">{error.message}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-3">When</th>
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Test</th>
            <th className="p-3">Report</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((r: any) => (
            <tr key={r.taker_id} className="border-b">
              <td className="p-3">
                {r.taken_at ? new Date(r.taken_at).toLocaleString() : "—"}
              </td>
              <td className="p-3">
                {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
              </td>
              <td className="p-3">{r.email || "—"}</td>
              <td className="p-3">{r.test_name}</td>
              <td className="p-3">
                {/* Replace with your actual public report URL pattern if different */}
                <Link className="underline" href={`/t/${r.taker_id}/result`} prefetch={false}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
