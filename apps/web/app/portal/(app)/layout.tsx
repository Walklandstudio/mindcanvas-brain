// apps/web/app/portal/(app)/layout.tsx
import Link from "next/link";
import { ReactNode } from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Org = { id: string; name: string; slug: string };

async function loadActiveOrg(): Promise<Org | null> {
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const sb = getAdminClient();
  const { data } = await sb
    .from("organizations")
    .select("id,name,slug")
    .eq("id", orgId)
    .maybeSingle();

  if (!data) return null;
  return { id: (data as any).id, name: (data as any).name, slug: (data as any).slug };
}

export default async function PortalAppLayout({ children }: { children: ReactNode }) {
  const org = await loadActiveOrg();

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Top nav */}
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/portal/home" className="font-semibold">
              MindCanvas
            </Link>
            <nav className="hidden gap-3 text-sm sm:flex">
              <Link href="/portal/home" className="hover:underline">
                Home
              </Link>
              <Link href="/portal/tests" className="hover:underline">
                Tests
              </Link>
              <Link href="/portal/people" className="hover:underline">
                People
              </Link>
              <Link href="/portal/submissions" className="hover:underline">
                Submissions
              </Link>
              <Link href="/portal/settings" className="hover:underline">
                Settings
              </Link>
              <Link href="/portal/orgs" className="hover:underline">
                Orgs
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {org ? org.name : "No active org"}
            </span>
            <form action="/api/portal/logout" method="post">
              <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
