// apps/web/app/portal/admin/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function AdminOrgsPage() {
  const sb = createClient().schema("portal");
  const { data: orgs, error } = await sb
    .from("v_organizations")
    .select("id, slug, name")
    .order("name");

  if (error) {
    return (
      <div className="fixed inset-0 mc-bg text-red-400 flex items-center justify-center px-6">
        <div>Load error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 mc-bg text-white overflow-auto">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Organizations</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orgs/new"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:brightness-110 transition"
            >
              + Add organisation
            </Link>
            <Link
              href="/"
              className="text-sm text-sky-300 hover:text-sky-100 underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          </div>
        </header>

        <ul className="grid gap-4 md:grid-cols-2">
          {orgs?.map((o: any) => (
            <li
              key={o.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 shadow-lg flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-xs text-slate-300">{o.slug}</div>
              </div>
              <Link
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-[#64bae2] to-[#2d8fc4] px-4 py-2 text-sm font-medium text-white shadow hover:brightness-110 transition"
                href={`/portal/${o.slug}`}
              >
                Open portal
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}



