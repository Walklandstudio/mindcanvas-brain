// apps/web/app/portal/(app)/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

/**
 * Authenticated layout for all /portal/(app)/* pages.
 * - Redirects to /portal/login if user is not signed in.
 * - Displays top navigation and active organization context.
 * - Wraps protected portal pages: /portal/home, /portal/tests, etc.
 */

export const metadata = {
  title: "Client Portal | MindCanvas",
  description: "Access your MindCanvas client dashboard and reports.",
};

export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Require authentication
  const sb = await getServerSupabase();
  const { data: auth } = await sb.auth.getUser();

  if (!auth?.user) {
    redirect("/portal/login");
  }

  // ✅ Try to resolve active org for context
  let org: { id: string; name: string; slug: string } | null = null;
  try {
    org = await getActiveOrg();
  } catch {
    org = null;
  }

  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#0b0f16] text-white antialiased">
        {/* ─── Header / Navbar ─────────────────────────── */}
        <header className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <div className="font-semibold text-lg tracking-wide">
              MindCanvas Portal
            </div>
            <nav className="flex items-center gap-6 text-sm md:text-base">
              <Link href="/portal/home" className="hover:opacity-80">
                Home
              </Link>
              <Link href="/portal/tests" className="hover:opacity-80">
                Tests
              </Link>
              <Link href="/portal/people" className="hover:opacity-80">
                People
              </Link>
              <Link href="/portal/submissions" className="hover:opacity-80">
                Submissions
              </Link>
              <Link href="/portal/settings" className="hover:opacity-80">
                Settings
              </Link>
              <Link href="/portal/orgs" className="hover:opacity-80">
                Orgs
              </Link>

              <form action="/api/portal/logout" method="post">
                <button
                  className="hover:opacity-80 text-sm ml-3 border border-white/20 rounded-md px-3 py-1"
                  type="submit"
                >
                  Log out
                </button>
              </form>
            </nav>
          </div>
        </header>

        {/* ─── Org banner ──────────────────────────────── */}
        <div className="bg-white/5 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-2 text-sm flex items-center justify-between">
            <div>
              {org ? (
                <>
                  Active org:{" "}
                  <span className="font-medium">{org.name}</span>{" "}
                  <span className="text-white/60">/{org.slug}</span>
                </>
              ) : (
                <span className="text-amber-300">
                  No active org — pick one in Orgs.
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                className="underline hover:opacity-80"
                href="/portal/orgs"
              >
                Switch org
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Page content ─────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
