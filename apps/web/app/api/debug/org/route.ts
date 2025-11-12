export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  const bySlug = await supabaseAdmin
    .from("orgs")
    .select("id, slug, name")
    .ilike("slug", slug)
    .maybeSingle();
  return NextResponse.json({ slug, bySlug });
}
