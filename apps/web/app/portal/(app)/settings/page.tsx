// apps/web/app/portal/(app)/settings/page.tsx
import { getAdminClient, getActiveOrgId, getOrgBrand } from "@/app/_lib/portal";

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

export default async function SettingsPage() {
  const org = await loadActiveOrg();
  if (!org) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          No active organization found. Please ensure your account is a member of an org.
        </p>
      </main>
    );
  }

  const brand = await getOrgBrand(org.id);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Organization: <span className="font-medium">{org.name}</span> ({org.slug})
      </p>

      <form
        className="mt-6 space-y-4 rounded-xl border border-black/10 bg-white p-6"
        action="/api/portal/settings/save"
        method="post"
      >
        <input type="hidden" name="org_id" value={org.id} />

        <div>
          <label className="block text-sm font-medium">Logo URL</label>
          <input
            name="logo_url"
            defaultValue={(brand as any)?.logo_url ?? ""}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="https://…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">Primary color</label>
            <input
              name="primary_color"
              defaultValue={(brand as any)?.primary_color ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="#000000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Secondary color</label>
            <input
              name="secondary_color"
              defaultValue={(brand as any)?.secondary_color ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="#666666"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Accent color</label>
            <input
              name="accent_color"
              defaultValue={(brand as any)?.accent_color ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="#FF9900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Brand voice</label>
          <textarea
            name="brand_voice"
            defaultValue={(brand as any)?.brand_voice ?? ""}
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={4}
            placeholder="Tone, writing guidelines, etc."
          />
        </div>

        <div className="pt-2">
          <button className="rounded-md border px-4 py-2 text-sm hover:bg-slate-50">
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
