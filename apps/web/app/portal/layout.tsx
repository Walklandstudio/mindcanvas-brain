// apps/web/app/portal/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_CLIENT_PORTAL !== "enabled") redirect("/");

  // Require auth
  const sb = await getServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/portal/login");
  }

  // Resolve active org if possible (will throw only if none exist at all)
  let org: { id: string; name: string; slug: string } | null = null;
  try {
    org = await getActiveOrg();
  } catch {
    org = null;
  }

  return (
    <div className="min-h-dvh bg-[#0b0f16] text-white">
      <div className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="font-semibold">Client Portal</div>
          <nav className="flex items-center gap-6 text-lg">
            <Link href="/portal/home" className="hover:opacity-80">Home</Link>
            <Link href="/portal/tests" className="hover:opacity-80">Tests</Link>
            <Link href="/portal/people" className="hover:opacity-80">People</Link>
            <Link href="/portal/submissions" className="hover:opacity-80">Submissions</Link>
            <Link href="/portal/settings" className="hover:opacity-80">Settings</Link>
            <Link href="/portal/orgs" className="hover:opacity-80">Orgs</Link>
            <form action="/api/portal/logout" method="post">
              <button className="hover:opacity-80 text-sm ml-4" type="submit">Log out</button>
            </form>
          </nav>
        </div>
      </div>

      <div className="bg-white/5 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm flex items-center justify-between">
          <div>
            {org ? (
              <>Active org: <span className="font-medium">{org.name}</span>{" "}
                <span className="text-white/60">/{org.slug}</span></>
            ) : (
              <span className="text-amber-300">No active org — pick one in Orgs.</span>
            )}
          </div>
          <div className="flex gap-3">
            <Link className="underline hover:opacity-80" href="/portal/orgs">Switch org</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
