// apps/web/app/portal/orgs/page.tsx
import Link from "next/link";
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function OrgsPage() {
  const sb = await getServerSupabase();

  // Try to get an active org; if none, we’ll still render the list.
  let active: { id: string; name: string; slug: string } | null = null;
  try {
    active = await getActiveOrg(sb);
  } catch {
    active = null;
  }

  const { data: orgs, error } = await sb
    .from("organizations")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="text-red-400 mt-4">Failed to load organizations: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <Link href="/portal/home" className="text-blue-400 hover:underline">
          ← Back to Home
        </Link>
      </div>

      {active ? (
        <div className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm">
          Active org: <span className="font-medium">{active.name}</span>{" "}
          <span className="text-white/60">/{active.slug}</span>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
          No active org set. Pick one below.
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5 text-left text-sm">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {(orgs ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-white/5">
                <td className="p-3">{o.name}</td>
                <td className="p-3 text-white/80">/{o.slug}</td>
                <td className="p-3">{new Date(o.created_at as any).toLocaleString()}</td>
                <td className="p-3 text-right">
                  {active?.id === o.id ? (
                    <span className="text-green-400">Active</span>
                  ) : (
                    <Link
                      href={`/portal/use?slug=${encodeURIComponent(o.slug)}&next=/portal/home`}
                      className="text-blue-400 hover:underline"
                    >
                      Use this org
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {(!orgs || orgs.length === 0) && (
              <tr>
                <td className="p-3 text-white/60" colSpan={4}>
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick links to jump directly into common pages for the active org */}
      {active && (
        <div className="flex gap-4">
          <Link className="text-blue-400 hover:underline" href="/portal/tests">Go to Tests</Link>
          <Link className="text-blue-400 hover:underline" href="/portal/submissions">Go to Submissions</Link>
          <Link className="text-blue-400 hover:underline" href="/portal/people">Go to People</Link>
          <Link className="text-blue-400 hover:underline" href="/portal/settings">Go to Settings</Link>
        </div>
      )}
    </div>
  );
}
