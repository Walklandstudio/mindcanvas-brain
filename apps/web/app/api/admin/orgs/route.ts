// apps/web/app/api/admin/orgs/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function GET() {
  const sb = createClient().schema("portal");
  const { data, error } = await sb
    .from("orgs")
    .select("id, slug, name")
    .order("name");

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const sb = createClient().schema("portal");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!name || !slug) {
    return NextResponse.json(
      { ok: false, error: "Both name and slug are required" },
      { status: 400 }
    );
  }

  // TODO: add real super-admin auth guard here (e.g. check session/role)

  // Map all expected wizard fields. Anything not listed here will be ignored,
  // which is safer than breaking on unknown keys.
  const record = {
    name,
    slug,
    // optional fields coming from NewClientWizardClient
    industry: body.industry ?? null,
    time_zone: body.time_zone ?? null,
    short_bio: body.short_bio ?? null,
    logo_url: body.logo_url ?? null,
    brand_primary: body.brand_primary ?? null,
    brand_secondary: body.brand_secondary ?? null,
    brand_background: body.brand_background ?? null,
    brand_text: body.brand_text ?? null,
    brand_accent: body.brand_accent ?? null,
    primary_contact_name: body.primary_contact_name ?? null,
    primary_contact_email: body.primary_contact_email ?? null,
    support_email: body.support_email ?? null,
    website_url: body.website_url ?? null,
    phone_number: body.phone_number ?? null,
    report_from_name: body.report_from_name ?? null,
    report_from_email: body.report_from_email ?? null,
    report_signoff_line: body.report_signoff_line ?? null,
    report_footer_notes: body.report_footer_notes ?? null,
    owner_auth_user_id: body.owner_auth_user_id ?? null,
  };

  const { data: org, error } = await sb
    .from("orgs")
    .insert(record)
    .select("id, name, slug")
    .single();

  if (error || !org) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Failed to create organisation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, org });
}


