export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Org = { id: string; name: string; slug: string };

async function loadOrgs() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Org[];
}

export default async function AdminPage() {
  try {
    const orgs = await loadOrgs();
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Admin — Organizations</h1>
        <div className="grid gap-3">
          {orgs.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between border rounded p-4 bg-white"
            >
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-xs text-slate-500">{o.slug}</div>
              </div>
              <Link
                href={`/portal/${o.slug}/dashboard`}
                className="px-3 py-2 rounded bg-gray-900 text-white hover:opacity-90"
              >
                Open portal
              </Link>
            </div>
          ))}
          {orgs.length === 0 && (
            <p className="text-slate-600">No organizations found.</p>
          )}
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="p-6 text-red-600">
        Error loading organizations: {e?.message}
      </div>
    );
  }
}
