// apps/web/app/api/portal/org/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normStr(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function normEmail(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

export async function GET(req: Request) {
  const sb = createClient().schema("portal");
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim();

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Missing org slug" },
      { status: 400 }
    );
  }

  const { data: org, error } = await sb
    .from("orgs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !org) {
    console.error("Get org profile error", error);
    return NextResponse.json(
      { ok: false, error: "Org not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, org });
}

export async function PATCH(req: Request) {
  const sb = createClient().schema("portal");
  const body = (await req.json().catch(() => ({}))) as any;

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing org id" },
      { status: 400 }
    );
  }

  // ✅ Whitelist fields we allow updating from the portal UI.
  // (Prevents accidental updates to columns you don’t mean to touch.)
  const allow = [
    // Basic info
    "name",
    "industry",
    "short_bio",

    // Branding (if stored on orgs in your schema)
    "logo_url",
    "brand_primary",
    "brand_secondary",
    "brand_background",
    "brand_text",

    // Contact
    "primary_contact_name",
    "primary_contact_email",
    "support_email",
    "website_url",

    // ✅ NEW internal notifications recipient
    "notification_email",

    // Report defaults
    "report_from_name",
    "report_from_email",
    "report_signoff_line",
    "report_footer_notes",
  ] as const;

  const updates: Record<string, any> = {};

  for (const k of allow) {
    if (!(k in body)) continue;

    // Normalize emails vs strings
    if (
      k === "primary_contact_email" ||
      k === "support_email" ||
      k === "report_from_email" ||
      k === "notification_email"
    ) {
      updates[k] = normEmail(body[k]);
    } else {
      updates[k] = normStr(body[k]);
    }
  }

  // Nothing to update
  if (Object.keys(updates).length === 0) {
    const { data: org, error } = await sb
      .from("orgs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !org) {
      return NextResponse.json(
        { ok: false, error: "Org not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, org });
  }

  // TODO: check that the authenticated user actually belongs to this org

  const { data: org, error } = await sb
    .from("orgs")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !org) {
    console.error("Update org profile error", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to update org" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, org });
}
