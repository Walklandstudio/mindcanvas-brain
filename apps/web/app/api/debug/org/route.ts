export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawSlug = url.searchParams.get("slug") ?? "";
  const slug = rawSlug.trim();
  const id = url.searchParams.get("id") ?? "";

  const bySlug = await supabaseAdmin
    .from("portal.orgs")
    .select("id, slug, name")
    .ilike("slug", slug)
    .maybeSingle();

  const byId = id
    ? await supabaseAdmin
        .from("portal.orgs")
        .select("id, slug, name")
        .eq("id", id)
        .maybeSingle()
    : null;

  return NextResponse.json({
    supabaseUrl: (process as any).env.NEXT_PUBLIC_SUPABASE_URL,
    projectRef:
      ((process as any).env.NEXT_PUBLIC_SUPABASE_URL || "")
        .split("https://")[1]
        ?.split(".supabase.co")[0] || null,
    slug,
    id,
    bySlug,
    byId,
  });
}
