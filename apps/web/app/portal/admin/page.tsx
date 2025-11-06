import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";
export const dynamic = "force-dynamic";

export default async function AdminOrgsPage() {
  const sb = createClient().schema("portal");
  const { data: orgs, error } = await sb
    .from("v_organizations")
    .select("id, slug, name")
    .order("name");

  if (error) return <div className="p-6 text-red-600">Load error: {error.message}</div>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <ul className="grid gap-3 md:grid-cols-2">
        {orgs?.map((o: any) => (
          <li key={o.id} className="border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-sm text-gray-500">{o.slug}</div>
              </div>
              <Link className="px-3 py-2 rounded-lg bg-black text-white" href={`/portal/${o.slug}`}>
                Open portal
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
