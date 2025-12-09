// apps/web/app/admin/orgs/[orgId]/import-test/page.tsx
import { createClient } from "@/lib/server/supabaseAdmin";
import ImportTestClient from "./ImportTestClient";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { orgId: string };
}) {
  const sb = createClient().schema("portal");

  const { data: org } = await sb
    .from("orgs")
    .select("id, name, slug")
    .eq("id", params.orgId)
    .single();

  return (
    <ImportTestClient
      orgId={params.orgId}
      orgName={org?.name ?? "Organisation"}
      orgSlug={org?.slug ?? ""}
    />
  );
}
