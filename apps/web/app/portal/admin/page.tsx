import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";
import AppBackground from "@/components/ui/AppBackground";

export const dynamic = "force-dynamic";

type Org = {
  id: string;
  slug: string;
  name: string;
  brand_name?: string | null;
  logo_url?: string | null;
};

export default async function AdminOrgsPage() {
  const sb = createClient().schema("portal");
  const { data: orgs, error } = await sb
    .from("v_organizations")
    .select("*")
    .order("name");

  if (error) {
    return (
      <main className="min-h-screen bg-[#050914] text-red-400 p-6">
        <p>Load error: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] text-white">
      <AppBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <Link
            href="/admin"
            className="text-sm text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline"
          >
            Back to admin
          </Link>
        </header>

        <ul className="grid gap-4 md:grid-cols-2">
          {orgs?.map((o: Org) => (
            <li
              key={o.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                {o.logo_url && (
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                    {/* we can keep this as img for now; swap to next/image later if you want */}
                    <img
                      src={o.logo_url}
                      alt={o.brand_name ?? o.name}
                      className="max-h-10 max-w-10 object-contain"
                    />
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium">
                    {o.brand_name ?? o.name}
                  </div>
                  <div className="text-xs text-white/60">{o.slug}</div>
                </div>
              </div>

              <Link
                href={`/portal/${o.slug}/dashboard`}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-gradient-to-b from-[#64bae2] to-[#2d8fc4] text-white shadow hover:brightness-110 transition"
              >
                Open portal
              </Link>
            </li>
          ))}

          {!orgs?.length && (
            <li className="text-sm text-white/70">No organizations found yet.</li>
          )}
        </ul>
      </div>
    </main>
  );
}
