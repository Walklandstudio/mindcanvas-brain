export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

/**
 * Debug endpoint:
 * /api/debug/org-by-id?id=<org_uuid>
 * Returns whether the org is found in the 'portal' or 'public' schema.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  const base = createClient();
  const portal = base.schema("portal");
  const pub = base.schema("public");

  const { data: portalData, error: portalErr } = await portal
    .from("orgs")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();

  const { data: publicData, error: publicErr } = await pub
    .from("orgs")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json({
    portal: { data: portalData, error: portalErr?.message ?? null },
    public: { data: publicData, error: publicErr?.message ?? null },
  });
}
