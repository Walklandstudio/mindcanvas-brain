// apps/web/app/api/admin/orgs/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function GET() {
  const sb = createClient().schema("portal");
  const { data, error } = await sb
    .from("orgs")
    .select("id, slug, name")
    .order("name", { ascending: true });
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json(data ?? []);
}

// New: create org (Step 1 of wizard)
export async function POST(req: Request) {
  const sb = createClient().schema("portal");

  // TODO: add super-admin auth check here

  const body = await req.json();

  const {
    name,
    slug,
    industry,
    short_bio,
    time_zone,
    logo_url,
    brand_primary,
    brand_secondary,
    brand_background,
    brand_text,
    brand_accent,
    primary_contact_name,
    primary_contact_email,
    support_email,
    website_url,
    phone_number,
    report_from_name,
    report_from_email,
    report_signoff_line,
    report_footer_notes,
    owner_auth_user_id,
  } = body;

  const { data: org, error } = await sb
    .from("orgs")
    .insert({
      name,
      slug,
      industry,
      short_bio,
      time_zone,
      logo_url,
      brand_primary,
      brand_secondary,
      brand_background,
      brand_text,
      brand_accent,
      primary_contact_name,
      primary_contact_email,
      support_email,
      website_url,
      phone_number,
      report_from_name,
      report_from_email,
      report_signoff_line,
      report_footer_notes,
    })
    .select("*")
    .single();

  if (error || !org) {
    console.error("Create org error", error);
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Failed to create org" },
      { status: 500 }
    );
  }

  // Optional: link an owner user if provided
  if (owner_auth_user_id) {
    const { error: linkError } = await sb.from("org_users").insert({
      org_id: org.id,
      user_id: owner_auth_user_id,
      role: "owner",
    });
    if (linkError) {
      console.error("Link owner error", linkError);
      // we don't fail the whole request; org is created
    }
  }

  return NextResponse.json({ ok: true, org });
}

