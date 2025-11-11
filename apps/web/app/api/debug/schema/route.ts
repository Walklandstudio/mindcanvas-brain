export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "team-puzzle").trim();
  const taker = (url.searchParams.get("taker") ?? "f765d050-94d9-47ee-9563-77fbf5dca476").trim();

  const orgBySlug = await supabaseAdmin
    .from("orgs")
    .select("id, slug, name")
    .ilike("slug", slug)
    .maybeSingle();

  const takerRow = await supabaseAdmin
    .from("test_takers")
    .select("id, org_id")
    .eq("id", taker)
    .maybeSingle();

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    schemaClient: "portal",
    queries: {
      orgBySlug,
      takerRow,
    },
  });
}
