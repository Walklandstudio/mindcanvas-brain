// apps/web/app/portal/(app)/orgs/page.tsx
import React from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

type Org = { id: string; name: string; slug: string } | null;

export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  // ✅ await the client
  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);

  let org: Org = null;
  if (orgId) {
    const { data, error } = await sb
      .from("organizations")
      .select("id,name,slug")
      .eq("id", orgId)
      .maybeSingle();

    if (!error) org = data ?? null;
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      {org ? (
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500 mb-1">Active organization</div>
          <div className="font-medium">{org.name}</div>
          <div className="text-gray-500">{org.slug}</div>
          <div className="text-xs text-gray-400 mt-1">{org.id}</div>
        </div>
      ) : (
        <p className="text-gray-500">No active organization found.</p>
      )}
    </main>
  );
}
