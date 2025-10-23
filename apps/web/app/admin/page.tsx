// apps/web/app/admin/page.tsx
import 'server-only';
import { cookies } from 'next/headers';
import { getServerSupabase, getAdminClient } from '@/app/_lib/portal';
import { isPlatformAdminEmail } from '@/app/_lib/admin';
import { makeSetActiveOrgCookie, makeClearActiveOrgCookie } from '@/app/_lib/org-active';

export const dynamic = 'force-dynamic';

async function setActiveOrg(orgId?: string) {
  'use server';
  const jar = await cookies();
  if (!orgId) {
    const [name, value, opts] = makeClearActiveOrgCookie();
    jar.set({ name, value, ...(opts as any) });
    return;
  }
  const [name, value, opts] = makeSetActiveOrgCookie(orgId);
  jar.set({ name, value, ...(opts as any) });
}

export default async function AdminPage() {
  const sbUser = await getServerSupabase();
  const { data: { user } } = await sbUser.auth.getUser();
  const email = user?.email ?? null;

  const allowList = (process.env.PLATFORM_ADMINS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = isPlatformAdminEmail(email);

  if (!isAdmin) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Platform Admin</h1>
        <div className="rounded-lg border p-3 bg-amber-50">
          <div className="font-medium">Access denied</div>
          <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li><strong>Signed in as:</strong> {email || 'Not signed in'}</li>
            <li><strong>Allowed emails:</strong> {allowList.length ? allowList.join(', ') : '(none set)'}</li>
            <li>Set <code>PLATFORM_ADMINS</code> in Vercel (staging) to your email, then redeploy.</li>
            <li>Make sure you’re signed in on <code>mindcanvas-staging.vercel.app</code>, not a preview URL.</li>
          </ul>
        </div>
        <div className="text-sm text-gray-600">
          Tip: after updating env vars, redeploy and refresh this page.
        </div>
      </div>
    );
  }

  let orgs: any[] = [];
  let errorMsg: string | null = null;
  try {
    const admin = await getAdminClient();
    const { data, error } = await admin
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: false });
    if (error) errorMsg = error.message;
    orgs = data ?? [];
  } catch (e: any) {
    errorMsg = e?.message || String(e);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Platform Admin — Organizations</h1>

      {errorMsg && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Error loading organizations: {errorMsg}
        </div>
      )}

      <div className="grid gap-3">
        {(orgs ?? []).map(o => (
          <form key={o.id} action={async () => { 'use server'; await setActiveOrg(o.id); }}>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-xs text-gray-600">{o.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                {/* Use the redirect route that sets cookie then opens the portal */}
                <a
                  className="underline text-sm"
                  href={`/admin/view-as/${o.id}`}
                >
                  Open Portal
                </a>
                <button type="submit" className="px-3 py-2 rounded-lg border text-sm">
                  View as this org
                </button>
              </div>
            </div>
          </form>
        ))}
      </div>

      <form action={async () => { 'use server'; await setActiveOrg(undefined); }}>
        <button className="px-3 py-2 rounded-lg border text-sm">Clear “view as”</button>
      </form>
    </div>
  );
}
