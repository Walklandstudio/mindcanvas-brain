import { createClient } from "@/lib/server/supabaseAdmin";
type Json = any;

export type ReportRaw = {
  org: {
    id: string; slug: string; name: string;
    brand_primary: string|null; brand_secondary: string|null; brand_accent: string|null; brand_text: string|null;
    logo_url: string|null; report_cover_tagline: string|null; report_disclaimer: string|null;
  } | null;
  taker: {
    id: string; org_id: string; test_id: string|null;
    first_name: string|null; last_name: string|null; email: string|null; company: string|null; role_title: string|null;
  } | null;
  test: { id: string; name: string|null; meta: Json|null } | null;
  latestResult: { id: string; created_at: string; totals: Json|null } | null;
};

export async function fetchReportData({ orgSlug, takerId }:{ orgSlug: string; takerId: string }): Promise<ReportRaw> {
  const sb = createClient().schema("portal");

  // TAKER FIRST (so we can fall back to taker.org_id)
  const { data: taker } = await sb
    .from("test_takers")
    .select("id, org_id, test_id, first_name, last_name, email, company, role_title")
    .eq("id", takerId)
    .maybeSingle();

  // ORG by slug (exact), then ilike, then by taker.org_id
  let org = null as ReportRaw["org"];

  if (orgSlug) {
    const { data: byEq } = await sb
      .from("orgs")
      .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
      .eq("slug", orgSlug.trim())
      .maybeSingle();
    org = (byEq as any) ?? null;

    if (!org) {
      const { data: byIlike } = await sb
        .from("orgs")
        .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
        .ilike("slug", orgSlug.trim())
        .maybeSingle();
      org = (byIlike as any) ?? null;
    }
  }

  if (!org && taker?.org_id) {
    const { data: byId } = await sb
      .from("orgs")
      .select("id,slug,name,brand_primary,brand_secondary,brand_accent,brand_text,logo_url,report_cover_tagline,report_disclaimer")
      .eq("id", taker.org_id)
      .maybeSingle();
    org = (byId as any) ?? null;
  }

  // TEST (optional)
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

  // Guard: taker must belong to org
  if (org && taker && taker.org_id !== org.id) {
    return { org: null, taker: null, test: null, latestResult: null };
  }

  return { org, taker: taker as any, test, latestResult };
}
