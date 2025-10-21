// apps/web/app/portal/(app)/orgs/page.tsx
import Link from "next/link";
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

async function loadMemberOrgs(): Promise<Org[]> {
  const sb = getAdminClient();

  // Get up to 100 org_ids the current portal context belongs to (shim behavior)
  const { data: memberships } = await sb
    .from("portal_members")
    .select("org_id")
    .limit(100);

  const ids = Array.from(
    new Set((memberships ?? []).map((m: any) => m.org_id).filter(Boolean))
  );

  if (ids.length === 0) return [];

  const { data: orgs } = await sb
    .from("organizations")
    .select("id,name,slug")
    .in("id", ids);

  return (orgs ?? []).map((o: any) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
  }));
}

export default async function OrgsPage() {
  const [active, orgs] = await Promise.all([loadActiveOrg(), loadMemberOrgs()]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-sm text-slate-500">
            {active ? (
              <>
                Active org: <span className="font-medium">{active.name}</span>
              </>
            ) : (
              "No active organization found."
            )}
          </p>
        </div>
        <Link
          href="/portal/home"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Back to Portal
        </Link>
      </div>

      {orgs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-black/10 bg-white p-6">
          <p className="text-slate-600">
            You don’t appear to be a member of any organizations yet.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {orgs.map((o) => {
            const isActive = active?.id === o.id;
            return (
              <li
                key={o.id}
                className={`rounded-xl border p-4 ${
                  isActive ? "border-black/30 bg-white" : "border-black/10 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-medium leading-tight">{o.name}</h2>
                    <p className="text-xs text-slate-500">/{o.slug}</p>
                  </div>
                  {isActive && (
                    <span className="rounded-md border px-2 py-0.5 text-xs text-slate-600">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/portal/home"
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Open
                  </Link>

                  {/* If you have an org-switch endpoint like /api/portal/use, enable this:
                      <form action={`/api/portal/use?org=${o.id}`} method="post">
                        <button
                          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
                          disabled={isActive}
                        >
                          Make Active
                        </button>
                      </form>
                  */}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
