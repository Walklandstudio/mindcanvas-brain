export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = u.searchParams.get("slug") || "team-puzzle";
  const id = u.searchParams.get("id") || "64c9d1f2-6e76-48e8-9e96-95ac6254d0bf";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef =
    supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1] || null;

  const byId = await supabaseAdmin
    .from("portal.orgs")
    .select("id,slug,name")
    .eq("id", id)
    .maybeSingle();

  const bySlug = await supabaseAdmin
    .from("portal.orgs")
    .select("id,slug,name")
    .eq("slug", slug)
    .maybeSingle();

  return NextResponse.json({
    supabaseUrl,
    projectRef,
    byId: byId.data,
    bySlug: bySlug.data,
    errors: { byId: byId.error?.message, bySlug: bySlug.error?.message },
  });
}
