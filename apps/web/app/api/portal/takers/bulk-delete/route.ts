// apps/web/app/api/portal/takers/bulk-delete/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  const form = await req.formData();
  const orgSlug = String(form.get("org") || "").trim();
  const idsRaw = form.getAll("ids").map((v) => String(v)).filter(Boolean);

  const redirectBack = () => {
    const ref = req.headers.get("referer");
    return NextResponse.redirect(ref || `/portal/${orgSlug || ""}/database`);
  };

  if (!orgSlug || idsRaw.length === 0) {
    // nothing selected — just go back
    return redirectBack();
  }

  const sb = createClient().schema("portal");

  // Resolve org_id first to enforce tenant isolation
  const { data: org, error: orgErr } = await sb
    .from("orgs")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgErr || !org) {
    console.error("bulk-delete: org lookup failed", orgErr);
    return redirectBack();
  }

  // Delete only rows that belong to this org
  const { error: delErr } = await sb
    .from("test_takers")
    .delete()
    .eq("org_id", org.id)
    .in("id", idsRaw);

  if (delErr) {
    console.error("bulk-delete: delete failed", delErr);
  }

  return redirectBack();
}
