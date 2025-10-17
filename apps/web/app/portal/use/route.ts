// apps/web/app/portal/use/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/_lib/portal";

/**
 * GET /portal/use?slug=competency-coach[&next=/portal/tests]
 * - resolves slug -> org_id
 * - sets cookie portal_org_id
 * - redirects to /portal/home (or ?next=...)
 */
export async function GET(req: Request) {
  const sb = await getServerSupabase();

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const next = url.searchParams.get("next") || "/portal/home";

  if (!slug) {
    return NextResponse.redirect(new URL("/portal/home", req.url), { status: 302 });
  }

  const { data, error } = await sb
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(new URL("/portal/home", req.url), { status: 302 });
  }

  const cs = await cookies();
  // @ts-ignore set() is available on the server
  cs.set("portal_org_id", data.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 });

  return NextResponse.redirect(new URL(next, req.url), { status: 302 });
}
