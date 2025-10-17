// apps/web/app/portal/people/page.tsx
import { ensurePortalMember } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalPeoplePage() {
  const { supabase, orgId } = await ensurePortalMember();

  // You can wire this to `test_takers` OR use `portal_invites`. Here we show both.
  const [{ data: takers }, { data: invites }] = await Promise.all([
    supabase.from("test_takers").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
    supabase.from("portal_invites").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">People</h1>

      <form action="/app/api/portal/invites/create" method="post" className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Invite person</h2>
        <div className="flex gap-2">
          <input name="email" type="email" required placeholder="email@company.com" className="border rounded px-3 py-2 w-full" />
          <button className="border rounded px-4 py-2 hover:bg-gray-50" type="submit">Invite</button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Creates a portal invite (role=client) and emails a link (wire up your mailer later).</p>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent invitees</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Token</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {(invites ?? []).map((i: any) => (
                <tr key={i.id} className="border-t">
                  <td className="px-3 py-2">{i.email}</td>
                  <td className="px-3 py-2">{i.role}</td>
                  <td className="px-3 py-2">{i.status}</td>
                  <td className="px-3 py-2 text-xs">{i.token}</td>
                  <td className="px-3 py-2">{new Date(i.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {(!invites || invites.length === 0) && (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No invites yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Test takers</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(takers ?? []).map((t: any) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{t.name ?? "—"}</td>
                  <td className="px-3 py-2">{t.email ?? "—"}</td>
                  <td className="px-3 py-2">{t.test_id}</td>
                  <td className="px-3 py-2">{t.status ?? "pending"}</td>
                </tr>
              ))}
              {(!takers || takers.length === 0) && (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No takers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
