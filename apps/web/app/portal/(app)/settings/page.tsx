// apps/web/app/portal/settings/page.tsx
import { getServerSupabase, getActiveOrg, getOrgBrand } from "@/app/_lib/portal";

export default async function SettingsPage() {
  const sb = await getServerSupabase();           // ✅ returns the Supabase client
  const org = await getActiveOrg(sb);             // ✅ resolves the active org
  const brand = await getOrgBrand(org.id, sb);    // ✅ current branding (or defaults)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings — {org.name}</h1>

      <form
        action="/api/portal/settings/save"
        method="post"
        className="space-y-4 max-w-xl border rounded-xl p-4"
      >
        <input type="hidden" name="org_id" value={org.id} />

        <div>
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <input
            name="logo_url"
            defaultValue={brand.logo_url ?? ""}
            className="w-full border rounded-md p-2"
            placeholder="https://…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Brand voice</label>
          <textarea
            name="brand_voice"
            defaultValue={brand.brand_voice ?? ""}
            rows={5}
            className="w-full border rounded-md p-2"
            placeholder="How should copy sound for this org?"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border px-4 py-2 hover:bg-gray-50"
          >
            Save
          </button>
        </div>
      </form>

      <div className="pt-4">
        <a className="text-blue-600 hover:underline" href="/portal/home">← Back to Home</a>
      </div>
    </div>
  );
}
