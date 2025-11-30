export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") || "";
  const sb = createClient().schema("portal");
  const { data, error } = await sb
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  return NextResponse.json({ data, error: error?.message ?? null });
}
