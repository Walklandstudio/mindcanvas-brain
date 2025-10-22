// apps/web/app/portal/(app)/settings/page.tsx
import React from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // ✅ resolve the Supabase client (await the promise)
  const sb = await getAdminClient();

  // ✅ figure out which org we're in
  const orgId = await getActiveOrgId(sb);
  if (!orgId) {
    return (
      <main className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-gray-500">No active organization.</p>
      </main>
    );
  }

  // ✅ load org core fields
  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .select("id,name,slug")
    .eq("id", orgId)
    .maybeSingle();

  // ✅ load optional brand settings if present
  const { data: brand, error: brandErr } = await sb
    .from("org_brand_settings")
    .select("company_name, logo_url, primary_color, accent_color")
    .eq("org_id", orgId)
    .maybeSingle();

  if (orgErr) {
    return (
      <main className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-red-600">Failed to load organization: {orgErr.message}</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-xl border p-4 space-y-2">
        <h2 className="text-lg font-medium">Organization</h2>
        <div className="text-sm text-gray-700">
          <div><span className="font-medium">Name:</span> {org?.name ?? "—"}</div>
          <div><span className="font-medium">Slug:</span> {org?.slug ?? "—"}</div>
          <div className="text-gray-400 text-xs mt-1">ID: {org?.id}</div>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-lg font-medium">Branding</h2>

        {brandErr ? (
          <p className="text-red-600 text-sm">Failed to load branding: {brandErr.message}</p>
        ) : (
          <div className="text-sm text-gray-700 space-y-1">
            <div><span className="font-medium">Company name:</span> {brand?.company_name ?? "—"}</div>
            <div><span className="font-medium">Logo URL:</span> {brand?.logo_url ?? "—"}</div>
            <div><span className="font-medium">Primary color:</span> {brand?.primary_color ?? "—"}</div>
            <div><span className="font-medium">Accent color:</span> {brand?.accent_color ?? "—"}</div>
          </div>
        )}
      </section>
    </main>
  );
}
