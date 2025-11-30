import { createClient } from "@/lib/server/supabaseAdmin";
type Json = any;

export type ReportRaw = {
  org: {
    id: string; slug: string; name: string;
    brand_primary: string|null; brand_secondary: string|null; brand_accent: string|null; brand_text: string|null;
    logo_url: string|null; report_cover_tagline: string|null; report_disclaimer: string|null;
    __schema?: "portal" | "public";
  } | null;
  taker: {
    id: string; org_id: string; test_id: string|null;
    first_name: string|null; last_name: string|null; email: string|null; company: string|null; role_title: string|null;
  } | null;
  test: { id: string; name: string|null; meta: Json|null } | null;
  latestResult: { id: string; created_at: string; totals: Json|null } | null;
};

async function selectOrgBySlug(slug: string) {
  const base = createClient();
  const portal = base.schema("portal");
  const pub = base.schema("public");

  // exact match first (portal)
  let { data } = await portal
    .from("orgs")
    .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
    .eq("slug", slug)
    .maybeSingle();
  if (data) return { ...data, __schema: "portal" as const };

  // ilike (portal)
  let ilike = await portal
    .from("orgs")
    .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
    .ilike("slug", slug)
    .maybeSingle();
  if (ilike.data) return { ...ilike.data, __schema: "portal" as const };

  // exact match in public
  let pubEq = await pub
    .from("orgs")
    .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
    .eq("slug", slug)
    .maybeSingle();
  if (pubEq.data) return { ...pubEq.data, __schema: "public" as const };

  // ilike in public
  let pubIlike = await pub
    .from("orgs")
    .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
    .ilike("slug", slug)
    .maybeSingle();
  if (pubIlike.data) return { ...pubIlike.data, __schema: "public" as const };

  return null;
}

async function selectOrgById(id: string) {
  const base = createClient();
  const portal = base.schema("portal");
  const pub = base.schema("public");

  let { data } = await portal
    .from("orgs")
    .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
    .eq("id", id)
    .maybeSingle();
  if (data) return { ...data, __schema: "portal" as const };

  let p2 = await pub
    .from("orgs")
    .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
    .eq("id", id)
    .maybeSingle();
  if (p2.data) return { ...p2.data, __schema: "public" as const };

  return null;
}

export async function fetchReportData({ orgSlug, takerId }:{ orgSlug: string; takerId: string }): Promise<ReportRaw> {
  const base = createClient();
  const sb = base.schema("portal");

  // TAKER FIRST
  const { data: taker } = await sb
    .from("test_takers")
    .select("id, org_id, test_id, first_name, last_name, email, company, role_title")
    .eq("id", takerId)
    .maybeSingle();

  // ORG by slug or by taker.org_id (both schemas)
  let org = null as ReportRaw["org"];
  if (orgSlug) org = await selectOrgBySlug(orgSlug.trim());
  if (!org && taker?.org_id) org = await selectOrgById(taker.org_id);

  // TEST
  let test = null as ReportRaw["test"];
  if (taker?.test_id) {
    const { data: t } = await sb.from("tests").select("id,name,meta").eq("id", taker.test_id).maybeSingle();
    test = (t as any) ?? null;
  }

  // LATEST RESULT
  let latestResult = null as ReportRaw["latestResult"];
  if (taker?.id) {
    const { data: results } = await sb
      .from("test_results")
      .select("id,created_at,totals")
      .eq("taker_id", taker.id)
      .not("totals","is",null)
      .order("created_at", { ascending: false })
      .limit(1);
    latestResult = (results ?? [])[0] ?? null;
  }

  // Guard: taker must belong to org (if both are present)
  if (org && taker && taker.org_id !== org.id) {
    return { org: null, taker: null, test: null, latestResult: null };
  }

  return { org, taker: taker as any, test, latestResult };
}
