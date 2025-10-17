// apps/web/app/portal/people/page.tsx
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function PeoplePage() {
  const sb = await getServerSupabase();
  const org = await getActiveOrg(sb);

  const { data: invites } = await sb
    .from("portal_invites")
    .select("id, email, role, status, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">People — {org.name}</h1>

      <InviteForm />

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Invited</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(invites ?? []).map((r: any) => (
              <tr key={r.id}>
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.role}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {(!invites || invites.length === 0) && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={4}>
                  No invites yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <a className="text-blue-600 hover:underline" href="/portal/home">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}

function InviteForm() {
  return (
    <form
      action="/api/portal/invites/create"
      method="post"
      className="flex gap-2 items-end"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input name="email" type="email" className="border rounded-md p-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <select name="role" className="border rounded-md p-2">
          <option value="client">client</option>
          <option value="manager">manager</option>
          <option value="viewer">viewer</option>
        </select>
      </div>
      <button className="border rounded-md px-4 py-2 hover:bg-gray-50" type="submit">
        Invite
      </button>
    </form>
  );
}
