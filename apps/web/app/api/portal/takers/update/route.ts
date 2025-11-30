// apps/web/app/api/portal/takers/update/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  const form = await req.formData();

  const orgSlug = String(form.get("org") || "").trim();
  const id = String(form.get("id") || "").trim();
  const redirect = String(form.get("redirect") || "").trim();

  const redirectBack = () =>
    NextResponse.redirect(
      redirect ||
        `/portal/${orgSlug || ""}/database${id ? `/${id}` : ""}`
    );

  if (!orgSlug || !id) {
    return redirectBack();
  }

  const updates: Record<string, any> = {
    first_name: ((form.get("first_name") as string) || "").trim() || null,
    last_name: ((form.get("last_name") as string) || "").trim() || null,
    email: ((form.get("email") as string) || "").trim() || null,
    phone: ((form.get("phone") as string) || "").trim() || null,
    company: ((form.get("company") as string) || "").trim() || null,
    role_title: ((form.get("role_title") as string) || "").trim() || null,
  };

  const sb = createClient().schema("portal");

  // Ensure we only edit inside the right org
  const { data: org, error: orgErr } = await sb
    .from("orgs")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgErr || !org) {
    console.error("takers.update org lookup failed", orgErr);
    return redirectBack();
  }

  const { error: updErr } = await sb
    .from("test_takers")
    .update(updates)
    .eq("org_id", org.id)
    .eq("id", id);

  if (updErr) {
    console.error("takers.update failed", updErr);
  }

  return redirectBack();
}
