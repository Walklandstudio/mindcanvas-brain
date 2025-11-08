import { createClient } from "@/lib/server/supabaseAdmin";
import LinksClient from "./LinksClient";

export const dynamic = "force-dynamic";

export default async function OrgLinksPage({ params }: { params: { slug: string } }) {
  const sb = createClient().schema("portal");
  const { data: org, error } = await sb
    .from("orgs")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) return <div className="p-6 text-red-600">{error.message}</div>;
  if (!org) return <div className="p-6 text-red-600">Org not found</div>;

  return <LinksClient orgId={org.id} orgSlug={org.slug} orgName={org.name ?? org.slug} />;
}
