// apps/web/app/portal/(app)/layout.tsx
import React from "react";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

type Org = { id: string; name: string; slug: string } | null;

export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Await the admin client (it returns a Promise)
  const sb = await getAdminClient();

  // ✅ Resolve the active org id from cookies/session (or however your helper does it)
  const orgId = await getActiveOrgId(sb);

  // ✅ Fetch the org record safely
  let org: Org = null;
  if (orgId) {
    const { data, error } = await sb
      .from("organizations")
      .select("id,name,slug")
      .eq("id", orgId)
      .maybeSingle();

    if (error) {
      // You can log this to your observability tool if you like
      console.error("Failed to load organization:", error.message);
    } else {
      org = data ?? null;
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">Portal</h1>
          <p className="text-sm text-gray-500">
            {org ? (
              <>
                Active org: <span className="font-medium">{org.name}</span>
                {" ("}
                {org.slug}
                {")"}
              </>
            ) : (
              "No active organization"
            )}
          </p>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}
