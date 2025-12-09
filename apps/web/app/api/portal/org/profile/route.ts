// apps/web/app/api/portal/org/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  const sb = createClient().schema("portal");
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

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
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing org id" },
      { status: 400 }
    );
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
      { ok: false, error: "Failed to update org" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, org });
}
