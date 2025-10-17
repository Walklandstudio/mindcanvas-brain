// apps/web/app/portal/settings/page.tsx
import { ensurePortalMember, getOrgBrand } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  const { supabase, orgId } = await ensurePortalMember();
  const brand = await getOrgBrand(orgId);

  // Basic form posting to the same page via Route Handler (below), but to keep MVP short,
  // we'll do a direct upsert here using Server Actions in the next iteration if needed.
  // For now just SHOW current settings:
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Brand Settings</h1>
      <div className="border rounded-lg p-4 space-y-2">
        <div><span className="text-sm text-gray-600">Logo URL:</span> <code className="text-xs break-all">{brand?.logo_url ?? "—"}</code></div>
        <div><span className="text-sm text-gray-600">Brand voice:</span> {brand?.brand_voice ?? "—"}</div>
        <div><span className="text-sm text-gray-600">Audience:</span> {brand?.audience ?? "—"}</div>
        <div><span className="text-sm text-gray-600">Notes:</span> {brand?.notes ?? "—"}</div>
      </div>

      <form action="/app/api/portal/settings/save" method="post" className="border rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold">Update</h2>
        <input className="border rounded px-3 py-2 w-full" name="logo_url" placeholder="https://.../logo.png" defaultValue={brand?.logo_url ?? ""} />
        <textarea className="border rounded px-3 py-2 w-full" name="brand_voice" placeholder="Warm, concise, empowering">{brand?.brand_voice ?? ""}</textarea>
        <input className="border rounded px-3 py-2 w-full" name="audience" placeholder="Leaders, HR, People Ops" defaultValue={brand?.audience ?? ""} />
        <textarea className="border rounded px-3 py-2 w-full" name="notes" placeholder="Internal notes...">{brand?.notes ?? ""}</textarea>
        <button className="border rounded px-4 py-2 hover:bg-gray-50" type="submit">Save</button>
      </form>
    </div>
  );
}
