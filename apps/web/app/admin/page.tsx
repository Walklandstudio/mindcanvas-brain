import { getAdminClient, getServerSupabase } from '@/app/_lib/portal';
import { isPlatformAdminEmail } from '@/app/_lib/admin';

export const dynamic = 'force-dynamic';

async function switchOrg(orgId?: string) {
  'use server';
  await fetch('/api/admin/switch-org', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orgId: orgId ?? '' }),
    cache: 'no-store',
  });
}

export default async function AdminPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!isPlatformAdminEmail(user?.email ?? null)) {
    return <div className="p-6">Forbidden</div>;
  }

  const admin = await getAdminClient(); // service role
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Platform Admin — Organizations</h1>
      <div className="grid gap-3">
        {(orgs ?? []).map(o => (
          <form key={o.id} action={async () => { 'use server'; await switchOrg(o.id); }}>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-xs text-gray-600">{o.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <a className="underline text-sm" href={`/portal`} target="_blank">Open Portal</a>
                <button className="px-3 py-2 rounded-lg border text-sm" type="submit">
                  View as this org
                </button>
              </div>
            </div>
          </form>
        ))}
      </div>

      <form action={async () => { 'use server'; await switchOrg(undefined); }}>
        <button className="px-3 py-2 rounded-lg border text-sm">
          Clear “view as” (back to my default)
        </button>
      </form>
    </div>
  );
}
